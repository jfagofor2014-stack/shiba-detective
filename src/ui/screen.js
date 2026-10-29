import { art, artImage, artLabel } from './art.js';
import { typewriter } from './typewriter.js';

/** [ラベル：値] を作る。値は <b> で色を変える */
function bracket(el, label, value, emphasize) {
  el.replaceChildren(`[${label}：`);
  if (emphasize) {
    const b = document.createElement('b');
    b.textContent = value;
    el.append(b, ']');
  } else {
    el.append(`${value}]`);
  }
}

export function renderStatus(el, { locationName, buddyLabel, routeLabel }) {
  bracket(el.querySelector('#status-location'), '場所', locationName, false);
  bracket(el.querySelector('#status-buddy'), 'バディ', buddyLabel, true);
  bracket(el.querySelector('#status-route'), '視点', routeLabel, false);
}

/**
 * src の画像を el に出す。読めなければ（画像が無い・オフラインで未キャッシュ）fallback() の SVG を出す。
 * 同じ画像が出ていれば何もしない（場面が変わらない時のちらつき防止）。
 */
export function showImage(el, src, alt, fallback) {
  if (!src) { el.innerHTML = fallback(); return; }
  if (el.firstElementChild?.getAttribute('src') === src) return;
  const img = document.createElement('img');
  img.alt = alt;
  img.decoding = 'async';
  img.addEventListener('error', () => { if (img.isConnected) el.innerHTML = fallback(); }, { once: true });
  img.src = src;
  el.replaceChildren(img);
}

/** ctx はその場面に誰を立たせるか（art.js の art() を参照） */
export function renderArt(el, artId, ctx) {
  showImage(el, artImage(artId, ctx), artLabel(artId), () => art(artId, ctx));
}

/** lines: [{ speaker, text }]。speaker が無い行は地の文として dim 表示する。『』で囲んだ語は強調色にする。 */
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
    let target = body;   // 『』の中では <em> に書き込む
    active = typewriter(text, {
      onChar: (c) => {
        if (c === '『') {
          target = document.createElement('em');
          body.append(target);
        }
        target.append(c);
        if (c === '』') target = body;
        onChar?.();
      },
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
