import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { artImage, artImages, TITLE_IMAGE } from '../src/ui/art.js';

const root = new URL('../', import.meta.url);
const exists = (p) => existsSync(new URL(p, root));
const buddies = { junko: 'hana', taichi: 'kuranosuke' };

test('場所の絵はその視点のバディの犬の画像になる', () => {
  assert.equal(artImage('living', { route: 'junko', buddies }), 'img/living-hana.webp');
  assert.equal(artImage('kichi', { route: 'taichi', buddies }), 'img/kichi-kuranosuke.webp');
});

test('犬の大写しはバディに関係なくその犬の画像', () => {
  assert.equal(artImage('raizo', { route: 'junko', buddies }), 'img/closeup-raizo.webp');
});

test('第4章（common）のリビングは全員そろった絵', () => {
  assert.equal(artImage('living', { route: 'common', buddies }), 'img/finale.webp');
});

test('画像が無い組み合わせは null（SVG で描く）', () => {
  assert.equal(artImage('living', {}), null);
  assert.equal(artImage('nowhere', { route: 'junko', buddies }), null);
});

test('シナリオに出てくる全場面・全バディの画像ファイルがそろっている', () => {
  const data = JSON.parse(readFileSync(new URL('data/scenario.json', root), 'utf8'));
  const scenes = Array.isArray(data.scenes) ? data.scenes : Object.values(data.scenes ?? data);
  const missing = new Set();
  for (const s of scenes) {
    if (!s.art) continue;
    for (const dog of ['raizo', 'hana', 'kuranosuke']) {
      const src = artImage(s.art, { route: s.route, buddies: { junko: dog, taichi: dog } });
      if (!src || !exists(src)) missing.add(`${s.route}/${s.art}/${dog}: ${src}`);
    }
  }
  assert.deepEqual([...missing], []);
  assert.ok(exists(TITLE_IMAGE));
});

test('artImages はタイトルと全26枚を重複なく返し、Service Worker がすべて事前キャッシュする', () => {
  const list = artImages();
  assert.equal(list.length, 26);
  assert.equal(new Set(list).size, 26);
  assert.ok(list.includes(TITLE_IMAGE));
  for (const p of list) assert.ok(exists(p), p);
  const sw = readFileSync(new URL('sw.js', root), 'utf8');
  for (const p of list) assert.ok(sw.includes(`'./${p}'`), `sw.js に ${p} が無い`);
});
