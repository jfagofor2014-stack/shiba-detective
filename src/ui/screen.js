import { art } from './art.js';
import { typewriter } from './typewriter.js';

export function renderStatus(el, { locationName, buddyLabel, routeLabel }) {
  el.querySelector('#status-location').textContent = `[場所: ${locationName}]`;
  el.querySelector('#status-buddy').textContent = `[バディ: ${buddyLabel}]`;
  el.querySelector('#status-route').textContent = `[視点: ${routeLabel}]`;
}

export function renderArt(el, artId) {
  el.innerHTML = art(artId);
}

/** lines: [{ speaker, text }]。speaker が無い行は地の文として dim 表示する。 */
export function renderDialogue(el, lines, { onDone, onChar } = {}) {
  el.innerHTML = '';
  let active = null;
  let i = 0;

  const next = () => {
    if (i >= lines.length) { active = null; onDone?.(); return; }
    const { speaker, text } = lines[i++];
    const p = document.createElement('p');
    if (speaker) {
      const s = document.createElement('span');
      s.className = 'speaker';
      s.textContent = speaker;
      p.append(s);
    } else {
      p.className = 'narration';
    }
    const body = document.createElement('span');
    if (speaker) body.className = 'line-end';
    p.append(body);
    el.append(p);
    active = typewriter(text, {
      onChar: (c) => { body.textContent += c; onChar?.(); },
      onDone: next,
    });
  };

  next();
  return { skip: () => active?.skip() };
}

export function renderCommands(el, commands, onPick) {
  el.innerHTML = '';
  commands.forEach((cmd, idx) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${idx + 1}. ${cmd.text.replace(/^▶/, '')}`;
    btn.addEventListener('click', () => onPick(cmd));
    li.append(btn);
    el.append(li);
  });
}

export function appendFeed(el, text) {
  const p = document.createElement('p');
  p.textContent = `>> ${text}`;
  el.replaceChildren(p);
}
