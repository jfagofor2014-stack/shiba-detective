export function typewriter(text, { onChar, onDone, delay = 24, schedule = setTimeout } = {}) {
  const chars = [...text];   // サロゲートペアを1文字として扱う
  let i = 0;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    onDone?.();
  };

  const step = () => {
    if (finished) return;
    if (i >= chars.length) return finish();
    onChar(chars[i++]);
    if (i < chars.length) schedule(step, delay);
    else finish();
  };

  if (chars.length === 0) finish();
  else schedule(step, delay);

  return {
    skip() {
      if (finished) return;
      while (i < chars.length) onChar(chars[i++]);
      finish();
    },
  };
}
