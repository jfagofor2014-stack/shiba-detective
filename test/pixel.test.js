import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sprite, rect, mirror } from '../src/ui/pixel.js';

test('rect は整数座標の <rect> を返す', () => {
  assert.equal(rect(1, 2, 3, 4, '#fff'), '<rect x="1" y="2" width="3" height="4" fill="#fff"/>');
});

test('sprite は横に続く同色の画素を1つの rect にまとめ、. を透明にする', () => {
  const svg = sprite(['aab.', '.bbb'], { a: '#a', b: '#b' });
  assert.equal(svg,
    rect(0, 0, 2, 1, '#a') + rect(2, 0, 1, 1, '#b') +
    rect(1, 1, 3, 1, '#b'));
});

test('sprite は x/y でずらせる', () => {
  assert.equal(sprite(['a'], { a: '#a' }, { x: 10, y: 5 }), rect(10, 5, 1, 1, '#a'));
});

test('sprite は flip で左右反転する（短い行も幅を揃えて反転）', () => {
  assert.equal(sprite(['ab', 'a'], { a: '#a', b: '#b' }, { flip: true }),
    rect(0, 0, 1, 1, '#b') + rect(1, 0, 1, 1, '#a') + rect(1, 1, 1, 1, '#a'));
});

test('sprite は scale で画素を拡大する', () => {
  assert.equal(sprite(['aa'], { a: '#a' }, { x: 1, y: 1, scale: 3 }), rect(1, 1, 6, 3, '#a'));
});

test('palette の値が null の文字は描かない', () => {
  assert.equal(sprite(['ab'], { a: '#a', b: null }), rect(0, 0, 1, 1, '#a'));
});

test('palette に無い文字は例外（描き損じを見逃さない）', () => {
  assert.throws(() => sprite(['z'], { a: '#a' }), /no color for 'z'/);
});

test('mirror は左半分から左右対称の行を作る', () => {
  assert.deepEqual(mirror(['ab.', 'c']), ['ab..ba', 'cc']);
});
