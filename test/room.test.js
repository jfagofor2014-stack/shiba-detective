import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCode, roomPayload, mergeRemote } from '../src/net/room.js';

test('generateCode は4桁の数字文字列', () => {
  assert.match(generateCode(() => 0), /^\d{4}$/);
  assert.equal(generateCode(() => 0), '0000');
  assert.equal(generateCode(() => 0.99999), '9999');
});

const base = () => ({
  buddies: { junko: 'raizo', taichi: 'kuranosuke' },
  supportDog: 'hana',
  sceneId: { junko: 'a', taichi: 'b' },
  chapter: { junko: 1, taichi: 1 },
  chapterDone: { junko: false, taichi: false },
  flags: { evidence_mud: true },
  counters: { taichi_mitsumeru: 1 },
  deductions: ['cat'],
  ending: null,
});

test('roomPayload は expiresAt を24時間後にする', () => {
  const p = roomPayload(base(), { uid: 'u1', now: 1000 });
  assert.equal(p.createdAt, 1000);
  assert.equal(p.expiresAt, 1000 + 86400000);
  assert.equal(p.phase, 'playing');
  assert.deepEqual(p.flags, { evidence_mud: true });
});

test('mergeRemote はフラグを和集合にする', () => {
  const local = base();
  const remote = { flags: { info_black_cat: true }, counters: {}, deductions: [] };
  const merged = mergeRemote(local, remote);
  assert.deepEqual(merged.flags, { evidence_mud: true, info_black_cat: true });
});

test('mergeRemote はカウンタを最大値にする', () => {
  const merged = mergeRemote(base(), { flags: {}, counters: { taichi_mitsumeru: 3 }, deductions: [] });
  assert.equal(merged.counters.taichi_mitsumeru, 3);
  const merged2 = mergeRemote(base(), { flags: {}, counters: { taichi_mitsumeru: 0 }, deductions: [] });
  assert.equal(merged2.counters.taichi_mitsumeru, 1);
});

test('mergeRemote は deductions を和集合にし重複しない', () => {
  const merged = mergeRemote(base(), { flags: {}, counters: {}, deductions: ['cat', 'hair'] });
  assert.deepEqual(merged.deductions.sort(), ['cat', 'hair']);
});

test('mergeRemote は remote が空でも壊れない', () => {
  assert.deepEqual(mergeRemote(base(), {}).flags, { evidence_mud: true });
  assert.deepEqual(mergeRemote(base(), {}).deductions, ['cat']);
});

test('mergeRemote は元の state を破壊しない', () => {
  const local = base();
  mergeRemote(local, { flags: { info_black_cat: true } });
  assert.deepEqual(local.flags, { evidence_mud: true });
});

test('mergeRemote は相手の sceneId / chapterDone を取り込む', () => {
  const merged = mergeRemote(base(), {
    players: { taichi: { sceneId: 'z', chapter: 2, chapterDone: true } },
  });
  assert.equal(merged.sceneId.taichi, 'z');
  assert.equal(merged.chapter.taichi, 2);
  assert.equal(merged.chapterDone.taichi, true);
  assert.equal(merged.sceneId.junko, 'a');
});
