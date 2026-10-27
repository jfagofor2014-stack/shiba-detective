// ドット絵の部品。全ての座標は整数の「画素」で、SVG 側で shape-rendering="crispEdges" のまま拡大する。

export const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;

/**
 * 格子文字列のドット絵を <rect> 群にする。'.' は透明。
 * 同じ色が横に続く画素は1つの rect にまとめる（要素数を抑えるため）。
 * palette の値が null の文字は描かない。palette に無い文字は描き損じなので例外にする。
 */
export function sprite(rows, palette, { x = 0, y = 0, flip = false, scale = 1 } = {}) {
  const width = Math.max(...rows.map((r) => r.length));
  let out = '';
  rows.forEach((row, j) => {
    const cells = flip ? [...row.padEnd(width, '.')].reverse() : [...row];
    let i = 0;
    while (i < cells.length) {
      const ch = cells[i];
      let k = i + 1;
      while (k < cells.length && cells[k] === ch) k++;
      if (ch !== '.') {
        if (!(ch in palette)) throw new Error(`palette has no color for '${ch}'`);
        const fill = palette[ch];
        if (fill) out += rect(x + i * scale, y + j * scale, (k - i) * scale, scale, fill);
      }
      i = k;
    }
  });
  return out;
}

/** 左半分の行から左右対称の行を作る */
export const mirror = (halfRows) => halfRows.map((r) => r + [...r].reverse().join(''));
