// キャラクターのドット絵（格子文字列）と配色。描画は pixel.js の sprite() に渡して行う。
import { mirror } from './pixel.js';

// ---- 柴犬（お座り・正面）32x32。左半分を描いて左右反転で作る ----
// o 輪郭 / b 毛 / d 毛の影 / c 裏白（クリーム・白） / a 差し色（黒柴の茶、赤柴の淡い毛）
// p 耳の内側 / n 鼻 / k 首輪
const DOG_HALF = [
  '................',
  '....oo..........',
  '...obbo.........',
  '...obpbo........',
  '..obppbbo.......',
  '..obppbbboooooo.',
  '..obppbbbbbbbbbo',
  '..obbpbbbbbbbbbb',
  '.obbbbbbbbbbbbbb',
  '.obbbbbbbbbbbbbb',
  '.obabbbbbbbbbbbb',
  '.obaabbbbbbbbbbb',
  '.obcabbbbbbbbbcc',
  '.occcabbbbbbbccc',
  '.occcccccccccccn',
  '..occcccccccccnn',
  '..occcccccccccco',
  '...occcccccccooc',
  '....oooccccccccc',
  '...obbbkkkkkkkkk',
  '..obbbbdkkkkkkkk',
  '..obbbbbcccccccc',
  '.obbbbbbcccccccc',
  '.obbbbbbbccccccc',
  '.obdbbbbbacccccc',
  '.obddbbbbacccccc',
  '.obddbbbbacccccc',
  '.obddbbbbacccccc',
  '.obddbbboacccccc',
  '..obdbbboaccccco',
  '..ooobbooccococo',
  '.....ooooooooooo',
];
export const DOG = mirror(DOG_HALF);

// 巻き尾（体の後ろから右へ渦を巻いてのぞく）
export const DOG_TAIL = [
  '..oooo..',
  '.obbbbo.',
  'obbccbbo',
  'obco.obo',
  'obo..obo',
  '.o..obbo',
  '....obo.',
  '...obbo.',
  '...obo..',
  '....o...',
];

// 目と眉は犬ごとに差し替える。DOG の (7, 9) に重ねる 18x3 の模様。
// 雷蔵: キリッとした吊り目 / はな: 丸い目 / 蔵之介: たれ目
export const EYE_AT = { x: 7, y: 9 };
const EYE_PATTERNS = {
  sharp: [
    'oo..............oo',
    '.oe............eo.',
    '..ee..........ee..',
  ],
  round: [
    '.a..............a.',
    '.ee............ee.',
    '.ew............we.',
  ],
  droopy: [
    '..................',
    'ee..............ee',
    '.oo............oo.',
  ],
};
export const dogEyes = (style) => EYE_PATTERNS[style];

const RED = {
  o: '#3a1c0c', b: '#d9802e', d: '#b05f1c', c: '#f7e6c4', a: '#f0cf9a',
  p: '#e89a72', n: '#1b0e08', e: '#1b0e08', w: '#ffffff',
};
const BLACK = {
  o: '#0b0b10', b: '#2e2d36', d: '#1c1c23', c: '#f2ede0', a: '#d19a4c',
  p: '#9a6656', n: '#0b0b10', e: '#0b0b10', w: '#ffffff',
};

// 尾は DOG の (27, 10) に体より先に描く
export const TAIL_AT = { x: 27, y: 10 };

// ---- 人物の胸像（左向き＝場面の方を見ている）26x40 ----
// h 髪 / H 髪のつや / s 肌 / S 肌の影 / e 目 / c 服 / C 服の明るい所 / o 輪郭
const JUNKO = [
  '..........hhhhhh..........',
  '........hhhhhhhhhh........',
  '......hhhhhhhhhhhhh.......',
  '.....hhhhHHhhhhhhhhh......',
  '....hhhHHhhhhhhhhhhhh.....',
  '....hhHhhhhhhhhhhhhhh.....',
  '...hhhhhhhhhhhhhhhhhhh....',
  '...hhhhhhhhhhhhhhhhhhh....',
  '..shhhhhhhhhhhhhhhhhhh....',
  '..sssshhhhhhhhhhhhhhhh....',
  '..seessshhhhhhhhhhhhhh....',
  '.sssssssshhhhhhhhhhhhh....',
  'ssssssssshhhhhhhhhhhhh....',
  '.sssssssShhhhhhhhhhhhh....',
  '..ssssssShhhhhhhhhhhhh....',
  '..sSssssShhhhhhhhhhhh.....',
  '...SsssSShhhhhhhhhhhh.....',
  '....SSSSShhhhhhhhhhh......',
  '.......SSShhhhhhhhh.......',
  '.......SSSS...hhh.........',
  '.......SSSS...............',
  '.....ccCCCCcccc...........',
  '...cccCCCCccccccccc.......',
  '..ccCCCCcccccccccccc......',
  '.cCCCCcccccccccccccccc....',
  '.cCCCccccccccccccccccc....',
  'cCCCccccccccccccccccccc...',
  'cCCcccccccccccccccccccc...',
  'cCCccccccccccccccccccccc..',
  'cCccccccccccccccccccccccc.',
  'cCccccccccccccccccccccccc.',
  'cCcccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
];
const TAICHI = [
  '..........................',
  '.........hhhhhh...........',
  '.......hhhhhhhhhh.........',
  '......hhhhHHhhhhhh........',
  '.....hhhHHhhhhhhhhh.......',
  '....hhhhhhhhhhhhhhhh......',
  '....hhhhhhhhhhhhhhhh......',
  '...shhhhhhhhhhhhhhhh......',
  '...sshhshhhhhhhhhhhh......',
  '..ssssssshhhhhhhhhhh......',
  '..seesssssshhhhhhhh.......',
  '.ssssssssssSShhhhhh.......',
  'sssssssssssSSShhhhh.......',
  '.sssssssssSSSSShhh........',
  '..ssssssssSSSSSSs.........',
  '..sSsssssSSSSSSs..........',
  '...SSssssSSSSSS...........',
  '....SSSSSSSSSS............',
  '.....SSSSSSSS.............',
  '.......SSSSS..............',
  '.......SSSSS..............',
  '.....ccCCCCccc............',
  '...cccCCCCcccccccc........',
  '..ccCCCCcccccccccccc......',
  '.cCCCCccccccccccccccc.....',
  '.cCCCcccccccccccccccccc...',
  'cCCCcccccccccccccccccccc..',
  'cCCccccccccccccccccccccc..',
  'cCCcccccccccccccccccccccc.',
  'cCccccccccccccccccccccccc.',
  'cCcccccccccccccccccccccccc',
  'cCcccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
  'cccccccccccccccccccccccccc',
];
const PERSON_BASE = { h: '#121219', H: '#2f3a58', s: '#e3ad86', S: '#a8724f', e: '#121219', o: '#07070b' };
export const PEOPLE = {
  junko: { rows: JUNKO, palette: { ...PERSON_BASE, c: '#2a2236', C: '#4a3d5e' } },
  taichi: { rows: TAICHI, palette: { ...PERSON_BASE, c: '#1d2a3a', C: '#34485f' } },
};

export const DOGS = {
  raizo: { palette: { ...RED, k: '#2f6fd1' }, eyes: 'sharp' },
  hana: { palette: { ...BLACK, k: '#e0507a' }, eyes: 'round' },
  kuranosuke: { palette: { ...RED, k: '#3fae5a' }, eyes: 'droopy' },
};
