// 場面のドット絵。192x108 画素の格子に描き、SVG を crispEdges のまま拡大して表示する。
// art(id, ctx) は「場所の背景」＋「その場面のバディ犬」＋「視点の人物」を重ねて返す。
import { rect as R, sprite } from './pixel.js';
import { DOG, DOG_TAIL, TAIL_AT, EYE_AT, dogEyes, DOGS, PEOPLE } from './sprites.js';

export const W = 192;
export const H = 108;

const C = {
  night0: '#0c1222', night1: '#121b30', night2: '#1a2540', night3: '#22304f',
  wall: '#1b2742', wallWarm: '#3a3446', beam: '#0b101d',
  woodDark: '#2a1c13', wood: '#4a3222', woodLight: '#6e4a30', woodHi: '#8a6040',
  tatami: '#3b573a', tatamiDark: '#2a4129', tatamiHeri: '#16241a', tatamiLit: '#56724a',
  paper: '#f0c47a', paperDim: '#c8914f', glow: '#f7b866', glowDim: '#8a5a3a',
  tv: '#07090f', tvScreen: '#1c2c48', tvShine: '#36507a',
  cushion: '#2c3f70', cushionHi: '#3e5694',
  tin: '#a8bfd6', tinHi: '#d9e6f2', tinDark: '#5e7690', fish: '#f08a3c',
  stone: '#4a4e5c', stoneDark: '#33363f', stoneHi: '#62677a',
  asphalt: '#22242c', asphaltHi: '#2e313b',
  shadow: '#0a0d16',
};

const join = (...parts) => parts.join('');
function svg(body, label) {
  const d = [...defs.values()].join('');
  defs = new Map();
  return `<svg viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${d ? `<defs>${d}</defs>` : ''}${body}</svg>`;
}
const text = (x, y, s, size, fill, anchor = 'middle') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-family="'DotGothic16', monospace">${s}</text>`;

/** 空のグラデーションを帯で描く（16bit 風に段階的に） */
function sky(y0, y1, colors) {
  const h = (y1 - y0) / colors.length;
  return colors.map((c, i) => R(0, Math.round(y0 + i * h), W, Math.ceil(h) + 1, c)).join('');
}

// 網掛けの模様（色ごとに1回だけ定義して、円を模様で塗る）
let defs = new Map();
const SHADES = {
  dense: (c) => R(0, 0, 1, 1, c) + R(1, 1, 1, 1, c),   // 2x2 の市松
  mid: (c) => R(0, 0, 1, 1, c),                        // 2x2 に1点
  sparse: (c) => R(0, 0, 1, 1, c),                     // 4x4 に1点
};
function shade(kind, color) {
  const id = `sd-${kind}-${color.replace(/[^0-9a-z]/gi, '')}`;
  const size = kind === 'sparse' ? 4 : 2;
  defs.set(id, `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">${SHADES[kind](color)}</pattern>`);
  return `url(#${id})`;
}

/** 四角い範囲を網掛けで塗る */
const hatch = (x, y, w, h, color, kind = 'dense') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${shade(kind, color)}"/>`;

/** 円形の光。中心ほど網掛けを濃くして、外へ向かって薄れさせる */
function glow(cx, cy, r, fill) {
  return [['sparse', 1], ['mid', 0.75], ['dense', 0.45]]
    .map(([kind, k]) => `<circle cx="${cx}" cy="${cy}" r="${Math.round(r * k)}" fill="${shade(kind, fill)}"/>`)
    .join('');
}

/** 1画素幅の円（車輪など） */
function ring(cx, cy, r, fill) {
  let out = '';
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (Math.abs(Math.hypot(x, y) - r) < 0.55) out += R(cx + x, cy + y, 1, 1, fill);
    }
  }
  return out;
}

// ---- キャラクター ----
export function dogSprite(id, { x = 0, y = 0, scale = 1 } = {}) {
  const d = DOGS[id];
  return join(
    sprite(DOG_TAIL, d.palette, { x: x + TAIL_AT.x * scale, y: y + TAIL_AT.y * scale, scale }),
    sprite(DOG, d.palette, { x, y, scale }),
    sprite(dogEyes(d.eyes), d.palette, { x: x + EYE_AT.x * scale, y: y + EYE_AT.y * scale, scale }),
  );
}
function person(id, { x, y, flip = false }) {
  const p = PEOPLE[id];
  return sprite(p.rows, p.palette, { x, y, flip });
}
/** 足元の影 */
const footShadow = (x, y, w) => R(x + 2, y, w - 4, 1, C.shadow) + R(x, y + 1, w, 1, C.shadow);

// ---- 場所 ----
function living() {
  let s = R(0, 0, W, 66, C.wall);
  s += hatch(104, 6, 88, 60, C.wallWarm);                 // ガラス戸から漏れる明かり
  s += R(0, 0, W, 5, C.beam) + R(0, 5, W, 1, C.woodDark);
  s += R(0, 5, 4, 61, C.woodDark) + R(120, 5, 4, 61, C.woodDark);
  // 本棚
  s += R(8, 16, 30, 50, C.woodDark) + R(10, 18, 26, 46, '#141b2c');
  const books = ['#8a3b3b', '#3b6a8a', '#c9a14a', '#5a8a4a', '#7a4a8a', '#a86a3a'];
  [30, 42, 54].forEach((sy, k) => {
    s += R(10, sy, 26, 2, C.wood);
    for (let i = 0; i < 6; i++) {
      const h = 7 + ((i + k) % 3);
      s += R(11 + i * 4, sy - h, 3, h, books[(i + k * 2) % books.length]);
    }
  });
  s += R(11, 60, 10, 4, C.tinDark);                         // 下段の箱
  // テレビ台とテレビ
  s += R(44, 52, 46, 14, C.wood) + R(44, 52, 46, 2, C.woodLight);
  s += R(48, 56, 18, 8, C.woodDark) + R(68, 56, 18, 8, C.woodDark) + R(56, 59, 2, 2, C.woodHi) + R(76, 59, 2, 2, C.woodHi);
  s += R(50, 28, 34, 23, C.tv) + R(52, 30, 30, 19, C.tvScreen) + R(54, 32, 6, 2, C.tvShine) + R(54, 34, 3, 2, C.tvShine);
  s += R(64, 51, 6, 1, C.tv);
  // ガラス戸（向こうの部屋の明かり）
  s += glow(158, 36, 42, C.glowDim);
  s += R(128, 9, 60, 57, C.woodDark);
  for (const dx of [131, 159]) {
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 2; i++) {
        s += R(dx + i * 13, 12 + j * 13, 12, 12, j < 2 ? C.paper : C.paperDim);
      }
    }
  }
  // 畳
  s += R(0, 66, W, 42, C.tatami) + R(0, 66, W, 1, C.tatamiHeri);
  for (const y of [80, 96]) s += R(0, y, W, 1, C.tatamiHeri);
  for (const [x, y0, y1] of [[48, 67, 80], [120, 67, 80], [24, 81, 96], [96, 81, 96], [168, 81, 96], [60, 97, 108], [140, 97, 108]]) {
    s += R(x, y0, 1, y1 - y0, C.tatamiHeri);
  }
  s += hatch(120, 67, 72, 13, C.tatamiLit);
  // ちゃぶ台と空き缶（お魚クッキーの缶）
  s += R(58, 90, 80, 2, C.tatamiDark);
  s += R(58, 72, 80, 4, C.woodLight) + R(58, 72, 80, 1, C.woodHi) + R(58, 76, 80, 3, C.wood);
  s += R(62, 79, 4, 11, C.woodDark) + R(130, 79, 4, 11, C.woodDark);
  s += R(110, 65, 14, 7, C.tin) + R(110, 65, 14, 1, C.tinHi) + R(110, 71, 14, 1, C.tinDark) + R(114, 67, 5, 2, C.fish) + R(119, 67, 1, 2, C.fish);
  // 座布団
  s += R(16, 94, 28, 7, C.cushion) + R(16, 94, 28, 1, C.cushionHi);
  return s;
}

function entrance() {
  let s = R(0, 0, W, 72, C.wall) + R(0, 0, W, 4, C.beam);
  // 天井の灯り
  s += glow(96, 8, 26, C.wallWarm) + R(92, 4, 8, 4, C.paper);
  // 玄関ドア（すりガラスに月明かり）
  s += R(74, 14, 44, 58, C.woodDark) + R(77, 17, 38, 55, '#3a2a20');
  s += R(82, 22, 28, 26, '#6f86b0') + R(82, 22, 28, 1, '#9fb4d6') + R(95, 22, 2, 26, '#4a5f86') + R(82, 34, 28, 1, '#4a5f86');
  s += R(108, 54, 3, 3, '#d9b46a');
  // 靴箱と花
  s += R(8, 40, 40, 32, C.wood) + R(8, 40, 40, 2, C.woodLight) + R(27, 44, 2, 26, C.woodDark) + R(23, 54, 2, 3, C.woodHi) + R(31, 54, 2, 3, C.woodHi);
  s += R(20, 30, 8, 10, '#5e7690') + R(18, 22, 4, 8, '#5a8a4a') + R(24, 20, 4, 9, '#5a8a4a') + R(16, 20, 4, 4, '#e0507a') + R(25, 17, 4, 4, '#f0c47a');
  // 傘立て
  s += R(150, 50, 12, 22, '#3a4660') + R(152, 34, 2, 16, '#c94a4a') + R(157, 30, 2, 20, '#3b6a8a') + R(151, 32, 4, 3, '#c94a4a') + R(156, 28, 4, 3, '#3b6a8a');
  // たたき（石）
  s += R(0, 72, W, 16, C.stone) + R(0, 72, W, 1, C.stoneHi);
  for (let x = 0; x < W; x += 24) s += R(x, 73, 1, 15, C.stoneDark);
  // 靴
  s += R(86, 80, 9, 3, '#e8e8f0') + R(97, 80, 9, 3, '#e8e8f0') + R(130, 81, 10, 3, '#3a2a20') + R(141, 81, 10, 3, '#3a2a20');
  // 上がり框と板の間
  s += R(0, 88, W, 3, C.woodHi) + R(0, 91, W, 17, C.woodLight);
  for (let y = 95; y < H; y += 5) s += R(0, y, W, 1, C.wood);
  return s;
}

function slope() {
  let s = sky(0, 44, ['#141433', '#24224a', '#3d2c5c', '#653a5e', '#9a4c58', '#d06f4c', '#ec9a54']);
  // 海と港の灯り
  s += R(0, 40, W, 10, '#1b2c4c');
  for (const [x, y] of [[20, 43], [52, 45], [90, 42], [130, 46], [170, 43]]) s += R(x, y, 6, 1, '#e8a65a');
  // 向こうの丘の家並み
  const hill = [[0, 30], [20, 26], [44, 28], [70, 24], [96, 22], [124, 26], [150, 20], [176, 24]];
  hill.forEach(([x, y], i) => {
    const w = (hill[i + 1]?.[0] ?? W) - x;
    s += R(x, y, w, 50 - y, '#1a1f36');
    for (let k = 0; k < 4; k++) if ((i + k) % 2 === 0) s += R(x + 4 + k * 5, y + 4 + (k % 2) * 6, 2, 2, '#f2c46a');
  });
  // 手前の家（右）
  s += R(118, 30, 74, 52, '#2c3048') + R(114, 26, 82, 5, '#4a2030') + R(118, 31, 74, 1, '#1a1c2c');
  s += R(128, 40, 12, 10, '#f2c46a') + R(128, 45, 12, 1, '#c88a40') + R(150, 40, 12, 10, '#3a4060') + R(172, 40, 12, 10, '#f2c46a');
  s += R(128, 60, 10, 22, '#3a2a20');
  // 石段の坂道（左下から右上へ）
  for (let i = 0; i < 9; i++) {
    const y = 104 - i * 6;
    const x0 = i * 12;
    s += R(x0, y, W - x0 - 60, 6, i % 2 ? C.stone : C.stoneHi) + R(x0, y, W - x0 - 60, 1, '#7a7f92');
  }
  s += R(0, 104, W, 4, C.stoneDark);
  // 街灯
  s += glow(21, 34, 12, '#7a5440') + R(20, 30, 2, 52, '#30343f') + R(16, 28, 10, 3, '#30343f') + R(17, 31, 8, 2, C.glow);
  return s;
}

function nikuten() {
  let s = sky(0, 12, ['#1a1a3a', '#2c2550', '#4a3060']);
  s += R(0, 8, W, 70, '#3e3128');
  // 看板
  s += R(36, 10, 120, 14, '#f2ead8') + R(36, 10, 120, 1, '#ffffff') + R(36, 23, 120, 1, '#b8ad96');
  s += text(96, 21, '井上肉店', 10, '#c23a2a');
  // 日よけ（赤白の縞）
  for (let i = 0; i < 26; i++) s += R(18 + i * 6, 26, 6, 8, i % 2 ? '#f2ead8' : '#c8352a');
  for (let i = 0; i < 26; i++) s += R(19 + i * 6, 34, 4, 2, i % 2 ? '#f2ead8' : '#c8352a');
  // 店の中（明るい）
  s += R(24, 36, 144, 30, '#f0d8a0') + R(24, 36, 144, 2, '#d9bd84');
  s += R(30, 42, 40, 3, '#b8925a') + R(122, 42, 40, 3, '#b8925a');
  for (let i = 0; i < 6; i++) s += R(32 + i * 6, 38, 4, 4, ['#c94a4a', '#e8b48c', '#8a5a32'][i % 3]);
  // ショーケース
  s += R(24, 58, 144, 22, '#4a6a8a') + R(26, 60, 140, 14, '#a8c8e0') + R(26, 60, 140, 2, '#d8ecf8');
  for (let i = 0; i < 9; i++) {
    const x = 32 + i * 15;
    s += R(x, 66, 10, 6, i % 3 === 0 ? '#d97a7a' : '#c8823a') + R(x + 1, 66, 8, 1, i % 3 === 0 ? '#f0a0a0' : '#e8a65a');
    s += R(x + 2, 62, 6, 3, '#ffffff');
  }
  s += R(24, 74, 144, 6, '#3a4a5e');
  // 道
  s += R(0, 80, W, 28, C.asphalt) + R(0, 80, W, 2, '#4a4e5c') + hatch(24, 82, 144, 6, '#4a3e34');
  return s;
}

function shimabaraya() {
  let s = sky(0, 30, ['#e9a25a', '#f0b770', '#f5cb8c', '#f7dba8']);
  s += R(0, 22, W, 62, '#d8ccae') + R(0, 22, W, 2, '#ece2c8');
  // 看板
  s += R(30, 26, 132, 16, '#2f7a4a') + R(30, 26, 132, 1, '#4a9a64') + text(96, 38, 'しまばらや', 11, '#ffffff');
  // ガラス戸とポスター
  s += R(56, 46, 80, 38, '#4a5a6a') + R(58, 48, 37, 36, '#8fb0c8') + R(97, 48, 37, 36, '#8fb0c8');
  s += R(62, 52, 12, 16, '#f2ead8') + R(63, 54, 10, 2, '#c8352a') + R(110, 54, 14, 10, '#f2ead8') + R(111, 56, 12, 2, '#2f7a4a');
  s += R(58, 48, 37, 2, '#c8e0f0') + R(97, 48, 37, 2, '#c8e0f0');
  // のぼり（特売）
  for (const x of [20, 166]) {
    s += R(x + 5, 40, 1, 44, '#5a5a5a') + R(x, 42, 6, 30, '#c8352a') + text(x + 3, 52, '特', 5, '#ffffff') + text(x + 3, 60, '売', 5, '#ffffff');
  }
  // 野菜の箱
  for (let i = 0; i < 3; i++) {
    const x = 10 + i * 16;
    s += R(x, 74, 14, 10, '#8a5a32') + R(x, 74, 14, 1, '#a8784a');
    const veg = ['#5aa04a', '#f08a3c', '#d04a3a'][i];
    for (let k = 0; k < 3; k++) s += R(x + 1 + k * 4, 70 + (k % 2), 4, 4, veg);
  }
  // 配達の自転車
  for (const cx of [144, 166]) s += ring(cx, 84, 6, '#2a2a33') + R(cx, 84, 1, 1, '#5a5a5a');
  s += R(144, 78, 22, 2, '#3b6a8a') + R(154, 72, 2, 8, '#3b6a8a') + R(150, 71, 8, 2, '#2a2a33') + R(164, 72, 2, 8, '#3b6a8a') + R(160, 66, 10, 6, '#8a5a32');
  // 歩道
  s += R(0, 84, W, 24, '#9a9488') + R(0, 84, W, 1, '#c8c0b0');
  for (let x = 0; x < W; x += 16) s += R(x, 85, 1, 23, '#857f74');
  return s;
}

function station() {
  let s = sky(0, 40, ['#1d1d40', '#33295a', '#5a3466', '#8c4466', '#c45e5a', '#e88a5a']);
  // 駅舎
  s += R(30, 28, 132, 52, '#4a5068') + R(26, 24, 140, 5, '#2c3044') + R(30, 29, 132, 1, '#626a88');
  s += R(64, 30, 64, 12, '#1d2238') + text(96, 39, '佐世保駅', 9, '#f2f2f2');
  // 時計
  s += R(140, 32, 12, 12, '#f2ead8') + R(145, 34, 2, 5, '#1a1a1a') + R(146, 38, 4, 1, '#1a1a1a') + R(139, 31, 14, 1, '#2c3044');
  // 改札の明かり
  for (let i = 0; i < 6; i++) s += R(38 + i * 20, 48, 16, 30, i === 2 || i === 3 ? '#f2d08a' : '#9ab0cc');
  s += R(30, 78, 132, 2, '#2c3044');
  // ヤシの木
  for (const x of [8, 176]) {
    s += R(x + 3, 36, 3, 50, '#5a4030');
    for (let k = 0; k < 5; k++) s += R(x + 3 - 2 * k, 34 + k, 4, 2, '#2f6a3a') + R(x + 4 + 2 * k, 34 + k, 4, 2, '#2f6a3a');
    s += R(x, 32, 9, 3, '#3a8a4a');
  }
  // 駅前広場
  s += R(0, 80, W, 28, '#5a5e6c') + R(0, 80, W, 1, '#7a7f92');
  for (let y = 86; y < H; y += 6) s += R(0, y, W, 1, '#4a4e5c');
  for (let x = 0; x < W; x += 12) s += R(x, 81, 1, 27, '#4a4e5c');
  return s;
}

function kichi() {
  let s = R(0, 0, W, 80, C.night0);
  for (const [x, y] of [[12, 6], [40, 3], [70, 9], [112, 4], [150, 7], [180, 2]]) s += R(x, y, 1, 1, '#c8d0f0');
  // 左右の店
  s += R(0, 18, 70, 62, '#3a2626') + R(122, 14, 70, 66, '#2a2a3a');
  s += R(70, 30, 52, 50, '#1e1e2c');
  for (let y = 22; y < 80; y += 4) s += R(0, y, 70, 1, '#2e1e1e');
  // ネオン看板
  s += glow(28, 32, 20, '#5a2048') + R(10, 26, 36, 12, '#1a0a14') + text(28, 35, 'BAR', 9, '#ff5ab4');
  s += glow(156, 28, 22, '#1a4a5a') + R(132, 22, 48, 12, '#0a1420') + text(156, 31, 'OPEN', 8, '#5ae8ff');
  s += R(80, 38, 32, 10, '#14140a') + text(96, 46, 'BEER', 7, '#f2d050');
  // 窓と扉
  s += R(14, 50, 20, 14, '#f2b866') + R(40, 54, 12, 26, '#1a0e0e');
  s += R(136, 46, 18, 12, '#e89a5a') + R(160, 46, 18, 12, '#3a4a6a') + R(150, 60, 12, 20, '#0e0e1a');
  // フェンス（基地の境）
  s += R(70, 60, 52, 1, '#5a5e6c');
  for (let x = 72; x < 122; x += 4) s += R(x, 60, 1, 20, '#5a5e6c');
  // 濡れた道にネオンが映る
  s += R(0, 80, W, 28, '#14141e') + R(0, 80, W, 1, '#3a3a4a');
  s += hatch(14, 84, 28, 14, '#5a2048') + hatch(140, 84, 32, 14, '#1a4a5a');
  return s;
}

function spotlight() {
  let s = R(0, 0, W, H, C.night1);
  s += glow(96, 60, 46, C.night3);
  s += R(56, 92, 80, 4, C.night3) + R(64, 96, 64, 2, C.night2);
  for (const [x, y] of [[30, 20], [160, 26], [24, 76], [168, 80], [150, 12]]) {
    s += R(x, y - 2, 1, 5, C.paper) + R(x - 2, y, 5, 1, C.paper);
  }
  return s;
}

const BACKGROUNDS = { living, entrance, slope, nikuten, shimabaraya, station, kichi };
const LABELS = {
  living: 'リビング', entrance: '玄関', slope: '坂道', nikuten: '井上肉店', shimabaraya: 'しまばらや',
  station: '佐世保駅', kichi: '基地の街', raizo: '雷蔵', hana: 'はな', kuranosuke: '蔵之介',
};
export const ART_IDS = Object.keys(LABELS);

// 場所ごとの立ち位置（犬は 32x32、人は 26x40）
const STAGE = {
  living: { dog: [74, 64] },
  entrance: { dog: [44, 64] },
  slope: { dog: [60, 62] },
  nikuten: { dog: [56, 66] },
  shimabaraya: { dog: [84, 64] },
  station: { dog: [60, 66] },
  kichi: { dog: [70, 66] },
};

/**
 * 場面の絵。ctx.route は 'junko' | 'taichi' | 'common'、ctx.buddies は { junko, taichi }。
 * 犬の大写し（raizo/hana/kuranosuke）はその犬だけを描く。
 */
export function art(id, { route, buddies } = {}) {
  if (id in DOGS) {
    return svg(spotlight() + footShadow(64, 92, 64) + dogSprite(id, { x: 64, y: 28, scale: 2 }), LABELS[id]);
  }
  const bg = BACKGROUNDS[id];
  if (!bg) return svg(R(0, 0, W, H, C.night1), '場面');
  let s = bg();
  if (route === 'common') {
    // 第4章: 三頭とふたりがそろう
    s += person('taichi', { x: 4, y: 68, flip: true }) + person('junko', { x: 162, y: 68 });
    for (const [dog, x] of [['raizo', 40], ['hana', 80], ['kuranosuke', 120]]) {
      s += footShadow(x, 96, 32) + dogSprite(dog, { x, y: 66 });
    }
  } else if (route && buddies?.[route]) {
    const [dx, dy] = STAGE[id].dog;
    s += footShadow(dx, dy + 31, 32) + dogSprite(buddies[route], { x: dx, y: dy });
    s += person(route, { x: W - 26, y: H - 40 });
  }
  return svg(s, LABELS[id]);
}

// ---- Gemini で描いた場面画像（img/*.webp）。無い時や読めない時は上の SVG で描く ----
export const TITLE_IMAGE = 'img/title.webp';
const DOG_IDS = ['raizo', 'hana', 'kuranosuke'];

/** art() と同じ場面の画像のパス。画像が無い組み合わせは null */
export function artImage(id, { route, buddies } = {}) {
  if (id in DOGS) return `img/closeup-${id}.webp`;
  if (!BACKGROUNDS[id]) return null;
  if (route === 'common') return id === 'living' ? 'img/finale.webp' : null;
  const dog = route && buddies?.[route];
  return dog ? `img/${id}-${dog}.webp` : null;
}

/** 画像の全パス（Service Worker の事前キャッシュと先読み用） */
export function artImages() {
  const places = Object.keys(BACKGROUNDS).flatMap((id) => DOG_IDS.map((dog) => `img/${id}-${dog}.webp`));
  return [TITLE_IMAGE, ...DOG_IDS.map((dog) => `img/closeup-${dog}.webp`), ...places, 'img/finale.webp'];
}

export function artLabel(id) {
  return LABELS[id] ?? '場面';
}

/** バディ選びのカードに載せる犬の絵 */
export function dogPortrait(id) {
  return `<svg viewBox="0 0 36 33" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${LABELS[id]}">${dogSprite(id, { x: 0, y: 0 })}</svg>`;
}

/** タイトル画面の背景 */
export function titleArt() {
  let s = living();
  s += R(0, 0, W, H, 'rgba(6,10,20,.35)');
  s += footShadow(0, 104, 64) + dogSprite('raizo', { x: 0, y: 42, scale: 2 });
  s += footShadow(132, 104, 56) + dogSprite('hana', { x: 128, y: 42, scale: 2 });
  s += footShadow(80, 102, 32) + dogSprite('kuranosuke', { x: 80, y: 70 });
  return svg(s, '柴犬探偵団のタイトル');
}

// 鹿撃ち帽をかぶった柴（タイトルのロゴとアイコン）
const HAT = [
  '.......oooooooooo.......',
  '.....oommmmmmmmmmoo.....',
  '....ommMmmMmmMmmMmmo....',
  '...ommmMmmMmmMmmMmmmo...',
  '...oMMMMMMMMMMMMMMMMMo..',
  '..ommmmMmmMmmMmmMmmmmmo.',
  '.oommmmMmmMmmMmmMmmmmmoo',
  'ommmmmmmmmmmmmmmmmmmmmmo',
  '.oooooooooooooooooooooo.',
];
const HAT_PALETTE = { o: '#2a1608', m: '#9a6a3a', M: '#6a4422' };
export function detectiveShiba() {
  const d = DOGS.raizo;
  const head = DOG.slice(0, 19);
  const body = join(
    sprite(head, d.palette, { x: 0, y: 4 }),
    sprite(dogEyes(d.eyes), d.palette, { x: EYE_AT.x, y: EYE_AT.y + 4 }),
    sprite(HAT, HAT_PALETTE, { x: 4, y: 0 }),
  );
  return `<svg viewBox="0 0 32 23" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="探偵の柴犬">${body}</svg>`;
}
