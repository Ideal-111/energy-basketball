/* No third-party scripts, analytics, or registration data collection. */
(() => {
  'use strict';
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  const smallScreen = window.matchMedia('(max-width: 760px)');
  function setMenu(open) {
    menuButton.setAttribute('aria-expanded', String(open));
    nav.hidden = smallScreen.matches && !open;
  }
  setMenu(false);
  smallScreen.addEventListener('change', () => setMenu(false));
  menuButton.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });

  function setupFilters(buttonAttribute, itemSelector, itemAttribute) {
    const buttons = document.querySelectorAll(`[${buttonAttribute}]`);
    buttons.forEach(button => button.addEventListener('click', () => {
      const selected = button.getAttribute(buttonAttribute);
      buttons.forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      let visibleCount = 0;
      document.querySelectorAll(itemSelector).forEach(item => {
        item.hidden = selected !== 'all' && item.getAttribute(itemAttribute) !== selected;
        if (!item.hidden) visibleCount += 1;
      });
      if (itemSelector === '.game-row') document.querySelector('#game-empty').hidden = visibleCount > 0;
    }));
  }
  setupFilters('data-game-filter', '.game-row', 'data-game-status');
  setupFilters('data-player-filter', '.player-card', 'data-number-group');

  // Only compare with the printed schedule; elapsed time does not confirm results.
  function refreshSchedule() {
    const now = Date.now();
    let nextFound = false;
    document.querySelectorAll('.game-row').forEach(row => {
      const start = new Date(row.getAttribute('data-game-start')).getTime();
      const end = new Date(row.getAttribute('data-game-end')).getTime();
      const confirmedResult = row.getAttribute('data-game-result');
      const elapsed = now >= end;
      const live = now >= start && !elapsed;
      const next = !confirmedResult && !elapsed && !nextFound;
      if (next) nextFound = true;
      row.setAttribute('data-game-status', confirmedResult ? 'finished' : elapsed ? 'past' : 'upcoming');
      row.classList.toggle('next-game', next);
      const tag = row.querySelector('.game-tag');
      tag.classList.toggle('neutral', !next && !confirmedResult);
      if (confirmedResult) {
        tag.textContent = '全场结束 · 能源胜';
        return;
      }
      tag.textContent = elapsed ? '赛期已过 · 赛果待补' : live ? '原定比赛时段' : next ? '下一场 · 原定' : '原定赛程';
    });
    document.querySelector('[data-game-filter][aria-pressed="true"]').click();
  }
  refreshSchedule();
  window.setInterval(refreshSchedule, 60000);

  const dialog = document.querySelector('#join-dialog');
  document.querySelector('#join-button').addEventListener('click', () => dialog.showModal());
  dialog.querySelectorAll('.dialog-close, .dialog-done').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });

  // Read event times from the schedule markup; dates use an explicit UTC+8 offset.
  const toCalendarUTC = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escapeCalendar = value => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  let messageTimer;
  document.querySelectorAll('[data-calendar]').forEach(button => button.addEventListener('click', () => {
    const row = button.closest('.game-row');
    const game = {
      date: row.getAttribute('data-game-start').slice(0, 10).replace(/-/g, ''),
      start: toCalendarUTC(row.getAttribute('data-game-start')),
      end: toCalendarUTC(row.getAttribute('data-game-end')),
      number: row.getAttribute('data-game-number'),
      title: row.getAttribute('data-game-title'),
      court: row.getAttribute('data-game-court')
    };
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const content = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ZJU Energy Basketball//Sanhao Cup 2026//ZH', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:sanhao2026-${game.number}@energy-basketball.example`, `DTSTAMP:${stamp}`,
      `DTSTART:${game.start}`, `DTEND:${game.end}`,
      `SUMMARY:${escapeCalendar(`2026 三好杯（原定）· ${game.title}`)}`,
      `LOCATION:${escapeCalendar(game.court)}`,
      'DESCRIPTION:据2026研究生三好杯秩序册整理的原定赛程；变更以组委会通知为准。', 'END:VEVENT', 'END:VCALENDAR', ''
    ].join('\r\n');
    // RFC 5545 folds lines at 75 octets without splitting UTF-8 characters.
    const encoder = new TextEncoder();
    const folded = content.split('\r\n').map(line => {
      let output = '', bytes = 0;
      for (const character of line) {
        const size = encoder.encode(character).length;
        if (bytes + size > 75) { output += '\r\n '; bytes = 1; }
        output += character;
        bytes += size;
      }
      return output;
    }).join('\r\n');
    const url = URL.createObjectURL(new Blob([folded], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `energy-sanhao-${game.date}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    const status = document.querySelector('#status-message');
    status.textContent = '原定赛程已导出，请打开 .ics 文件添加到日历。';
    status.classList.add('visible');
    clearTimeout(messageTimer);
    messageTimer = window.setTimeout(() => status.classList.remove('visible'), 5000);
  }));
})();
