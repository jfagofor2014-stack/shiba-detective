# 柴犬探偵団 〜リビングに消ゆ〜 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PC-8800風のザッピング式テキストアドベンチャーを、2人同時プレイ対応のWebアプリとして実装する。

**Architecture:** ゲーム状態の正はブラウザ内メモリに置き、純粋関数のエンジン（`src/engine.js`）がフラグ更新とエンディング判定を担う。その差分を Firebase Realtime Database にミラーし、相手の変更を購読して取り込む。エンジンはネットワークもDOMも知らないため、`node --test` で全分岐を検証できる。

**Tech Stack:** Vanilla JS（ESモジュール）、素のCSS、Firebase Realtime Database（匿名認証）、PWA（manifest + Service Worker）、`node --test`

設計書: `docs/superpowers/specs/2026-07-10-shiba-detective-design.md`

## Global Constraints

- ビルドツールを導入しない。ブラウザが直接読む ESモジュールのみ。
- テストは `node --test test/*.test.js` で走る。テストランナーを追加しない。
- `src/engine.js` は DOM API と Firebase SDK を import しない。純粋関数のみ。
- 犬のIDは `raizo` / `hana` / `kuranosuke` の3つ。ルートIDは `junko` / `taichi` の2つ。
- フラグ名は設計書§4.4の8種のみ: `evidence_mud`, `evidence_black_hair`, `heard_shadow`, `suspicious_father`, `info_black_cat`, `info_satoru_bag`, `found_empty_box`, `taichi_delay`
- カウンタ名は `taichi_mitsumeru` の1種のみ。
- エンディングIDは `"A" | "B" | "C" | "D"`。
- 乱数（`Math.random`）を使わない。蔵之介の狂犬化もサポート犬の割り込みも確定条件（設計書 §4.6 / §4.7）。
- 音は初期オフ。
- コミットメッセージは日本語可。各タスク末尾で必ずコミットする。

---

## File Structure

| ファイル | 責務 |
|---|---|
| `src/engine.js` | 純粋関数。条件評価、コマンド絞り込み、フラグ適用、エンディング判定 |
| `src/state.js` | ゲーム状態の生成と localStorage 退避 |
| `src/scenario.js` | `data/scenario.json` の読込とスキーマ検証 |
| `src/ui/art.js` | SVGドット絵をIDで返す |
| `src/ui/typewriter.js` | 1文字ずつの文字送り |
| `src/ui/screen.js` | 3ペインのDOM描画 |
| `src/ui/sound.js` | WebAudio の矩形波 |
| `src/net/firebase.js` | Firebase 初期化と匿名認証 |
| `src/net/room.js` | ルーム作成/参加/購読、バディ選択トランザクション |
| `src/main.js` | 画面遷移とイベント配線 |
| `data/scenario.json` | 全シーン |
| `test/engine.test.js` | エンジンの単体テスト |
| `test/scenario.test.js` | シナリオの整合性検証（リンク切れ・到達不能・エンディング到達可能性） |

---

## シーングラフ（確定版）

タスク4〜7はこの表に従って `data/scenario.json` を書く。**シーンIDと `next` の配線はここが正**。台詞の文面のみ執筆時に決める。

### 第1章

| sceneId | route | art | 主なコマンド | → next | setFlag |
|---|---|---|---|---|---|
| `ch1_junko_living` | junko | `living` | ▶しらべる（ソファ） | `ch1_junko_sofa` | — |
| | | | ▶しらべる（ソファの隙間）`{flag:evidence_mud}` | `ch1_junko_sofa_gap` | — |
| | | | ▶バディに頼む | `ch1_junko_buddy` | — |
| | | | ▶みつめる（窓の外） | `ch1_junko_window` | — |
| | | | ▶章を終える `{flag:evidence_mud}` | `ch1_junko_done` | — |
| `ch1_junko_sofa` | junko | `living` | ▶もどる | `ch1_junko_living` | `evidence_mud` |
| `ch1_junko_sofa_gap` | junko | `living` | ▶もどる | `ch1_junko_living` | `evidence_black_hair` |
| `ch1_junko_buddy` | junko | `living` | ▶クンクンする `{buddy:raizo}` | `ch1_junko_raizo` | — |
| | | | ▶ジロリとみる `{buddy:hana}` | `ch1_junko_hana` | — |
| | | | ▶へそ天 `{buddy:kuranosuke}` | `ch1_junko_kuranosuke` | — |
| `ch1_junko_raizo` | junko | `raizo` | ▶もどる | `ch1_junko_living` | `evidence_black_hair` |
| `ch1_junko_hana` | junko | `hana` | ▶もどる | `ch1_junko_living` | — |
| `ch1_junko_kuranosuke` | junko | `kuranosuke` | ▶もどる | `ch1_junko_living` | — |
| `ch1_junko_window` | junko | `living` | ▶もどる | `ch1_junko_living` | — |
| `ch1_junko_done` | junko | `living` | （章末・`chapterEnd: true`） | — | — |
| `ch1_taichi_entrance` | taichi | `entrance` | ▶きく（お母さんに） | `ch1_taichi_mother` | — |
| | | | ▶きく（お父さんに） | `ch1_taichi_father` | — |
| | | | ▶しらべる（ゴミ箱） | `ch1_taichi_trash` | — |
| | | | ▶バディに頼む | `ch1_taichi_buddy` | — |
| | | | ▶章を終える `{anyOf:[{flag:heard_shadow},{flag:suspicious_father}]}` | `ch1_taichi_done` | — |
| `ch1_taichi_mother` | taichi | `entrance` | ▶もどる | `ch1_taichi_entrance` | `heard_shadow` |
| `ch1_taichi_father` | taichi | `entrance` | ▶もどる | `ch1_taichi_entrance` | `suspicious_father` |
| `ch1_taichi_trash` | taichi | `entrance` | ▶もどる | `ch1_taichi_entrance` | — |
| `ch1_taichi_buddy` | taichi | `entrance` | ▶クンクンする `{buddy:raizo}` | `ch1_taichi_raizo` | — |
| | | | ▶ジロリとみる `{buddy:hana}` | `ch1_taichi_hana` | — |
| | | | ▶へそ天 `{buddy:kuranosuke}` | `ch1_taichi_kuranosuke` | — |
| `ch1_taichi_raizo` | taichi | `raizo` | ▶もどる | `ch1_taichi_entrance` | — |
| `ch1_taichi_hana` | taichi | `hana` | ▶もどる | `ch1_taichi_entrance` | `suspicious_father` |
| `ch1_taichi_kuranosuke` | taichi | `kuranosuke` | ▶もどる | `ch1_taichi_entrance` | — |
| `ch1_taichi_done` | taichi | `entrance` | （章末・`chapterEnd: true`） | — | — |

`ch1_taichi_hana` が `suspicious_father` を立てるのは、はなの「ジロリとみる」がNPCの嘘を正す能力だから（設計書 §4.6）。父に直接聞くルートと合わせて2経路ある。

### 第2章

| sceneId | route | art | 主なコマンド | → next | setFlag / count |
|---|---|---|---|---|---|
| `ch2_junko_slope` | junko | `slope` | ▶いどう（井上肉店へ） | `ch2_junko_nikuten` | — |
| | | | ▶しらべる（側溝） | `ch2_junko_gutter` | — |
| `ch2_junko_gutter` | junko | `slope` | ▶もどる | `ch2_junko_slope` | — |
| `ch2_junko_nikuten` | junko | `nikuten` | ▶きく（おばちゃんに） | `ch2_junko_obachan` | — |
| | | | ▶バディに頼む | `ch2_junko_buddy` | — |
| | | | ▶いどう（坂道へ） | `ch2_junko_slope` | — |
| | | | ▶章を終える `{flag:info_black_cat}` | `ch2_junko_done` | — |
| `ch2_junko_obachan` | junko | `nikuten` | ▶もどる | `ch2_junko_nikuten` | `info_black_cat` |
| `ch2_junko_buddy` | junko | `nikuten` | ▶クンクンする `{buddy:raizo}` | `ch2_junko_raizo` | — |
| | | | ▶ジロリとみる `{buddy:hana}` | `ch2_junko_hana` | — |
| | | | ▶へそ天 `{buddy:kuranosuke}` | `ch2_junko_kuranosuke` | — |
| `ch2_junko_raizo` | junko | `raizo` | ▶もどる | `ch2_junko_nikuten` | — |
| `ch2_junko_hana` | junko | `hana` | ▶もどる | `ch2_junko_nikuten` | `info_black_cat` |
| `ch2_junko_kuranosuke` | junko | `kuranosuke` | ▶もどる | `ch2_junko_nikuten` | — |
| `ch2_junko_done` | junko | `nikuten` | （章末・`chapterEnd: true`） | — | — |
| `ch2_taichi_station` | taichi | `station` | ▶いどう（しまばらやへ） | `ch2_taichi_shimabaraya` | — |
| | | | ▶みつめる（改札の美女を）`{buddyNot:hana}` | `ch2_taichi_station_look` | count `taichi_mitsumeru` |
| `ch2_taichi_station_look` | taichi | `station` | ▶もどる | `ch2_taichi_station` | — |
| `ch2_taichi_shimabaraya` | taichi | `shimabaraya` | ▶きく（事件について） | `ch2_taichi_listen` | — |
| | | | ▶みつめる（美女を）`{buddyNot:hana}` | `ch2_taichi_look_girl` | count `taichi_mitsumeru` |
| | | | ▶バディに頼む | `ch2_taichi_buddy` | — |
| | | | ▶いどう（佐世保駅へ） | `ch2_taichi_station` | — |
| | | | ▶章を終える `{flag:info_satoru_bag}` | `ch2_taichi_done` | — |
| `ch2_taichi_listen` | taichi | `shimabaraya` | ▶もどる | `ch2_taichi_shimabaraya` | `info_satoru_bag` |
| `ch2_taichi_look_girl` | taichi | `shimabaraya` | ▶もどる | `ch2_taichi_shimabaraya` | — |
| `ch2_taichi_buddy` | taichi | `shimabaraya` | ▶クンクンする `{buddy:raizo}` | `ch2_taichi_raizo` | — |
| | | | ▶ジロリとみる `{buddy:hana}` | `ch2_taichi_hana` | — |
| | | | ▶へそ天 `{buddy:kuranosuke}` | `ch2_taichi_kuranosuke` | — |
| `ch2_taichi_raizo` | taichi | `raizo` | ▶もどる | `ch2_taichi_shimabaraya` | `info_satoru_bag` |
| `ch2_taichi_hana` | taichi | `hana` | ▶もどる | `ch2_taichi_shimabaraya` | — |
| `ch2_taichi_kuranosuke` | taichi | `kuranosuke` | ▶もどる | `ch2_taichi_shimabaraya` | — |
| `ch2_taichi_done` | taichi | `shimabaraya` | （章末・`chapterEnd: true`） | — | — |

「みつめる」は2箇所（駅・しまばらや前）にあり、どちらも hub に戻るため反復可能。3回で `taichi_delay` が導出される。バディが はな のときは両方とも表示されない。

### 第3章

| sceneId | route | art | 主なコマンド | → next | setFlag |
|---|---|---|---|---|---|
| `ch3_junko_phone` | junko | `living` | ▶推理を送る（黒猫の話）`{flag:info_black_cat}` | `ch3_junko_sent_cat` | — |
| | | | ▶推理を送る（黒い毛）`{flag:evidence_black_hair}` | `ch3_junko_sent_hair` | — |
| | | | ▶推理を送る（泥の跡）`{flag:evidence_mud}` | `ch3_junko_sent_mud` | — |
| | | | ▶章を終える | `ch3_junko_done` | — |
| `ch3_junko_sent_cat` | junko | `living` | ▶もどる | `ch3_junko_phone` | — |
| `ch3_junko_sent_hair` | junko | `living` | ▶もどる | `ch3_junko_phone` | — |
| `ch3_junko_sent_mud` | junko | `living` | ▶もどる | `ch3_junko_phone` | — |
| `ch3_junko_done` | junko | `living` | （章末・`chapterEnd: true`） | — | — |
| `ch3_taichi_kichi` | taichi | `kichi` | ▶きく（紙袋のこと）`{flag:info_satoru_bag}` | `ch3_taichi_ask_bag` | — |
| | | | ▶きく（黒猫を見なかったか）`{deduction:cat}` | `ch3_taichi_ask_cat` | — |
| | | | ▶きく（黒い毛のこと）`{deduction:hair}` | `ch3_taichi_ask_hair` | — |
| | | | ▶きく（泥の跡のこと）`{deduction:mud}` | `ch3_taichi_ask_mud` | — |
| | | | ▶バディに頼む | `ch3_taichi_buddy` | — |
| | | | ▶章を終える | `ch3_taichi_done` | — |
| `ch3_taichi_ask_bag` | taichi | `kichi` | ▶もどる | `ch3_taichi_kichi` | — |
| `ch3_taichi_ask_cat` | taichi | `kichi` | ▶もどる | `ch3_taichi_kichi` | — |
| `ch3_taichi_ask_hair` | taichi | `kichi` | ▶もどる | `ch3_taichi_kichi` | — |
| `ch3_taichi_ask_mud` | taichi | `kichi` | ▶もどる | `ch3_taichi_kichi` | — |
| `ch3_taichi_buddy` | taichi | `kichi` | ▶クンクンする `{buddy:raizo}` | `ch3_taichi_raizo` | — |
| | | | ▶ジロリとみる `{buddy:hana}` | `ch3_taichi_hana` | — |
| | | | ▶へそ天 `{allOf:[{buddy:kuranosuke},{flag:info_satoru_bag}]}` | `ch3_taichi_kuranosuke_rage` | — |
| | | | ▶へそ天 `{allOf:[{buddy:kuranosuke},{not:{flag:info_satoru_bag}}]}` | `ch3_taichi_kuranosuke_idle` | — |
| `ch3_taichi_raizo` | taichi | `raizo` | ▶もどる | `ch3_taichi_kichi` | `found_empty_box` |
| `ch3_taichi_hana` | taichi | `hana` | ▶もどる | `ch3_taichi_kichi` | — |
| `ch3_taichi_kuranosuke_rage` | taichi | `kuranosuke` | ▶もどる | `ch3_taichi_kichi` | `found_empty_box` |
| `ch3_taichi_kuranosuke_idle` | taichi | `kuranosuke` | ▶もどる | `ch3_taichi_kichi` | — |
| `ch3_taichi_done` | taichi | `kichi` | （章末・`chapterEnd: true`） | — | — |

`{deduction:cat}` はじゅんこから送られた推理が届いている場合のみ真（タスク3で `evaluate` に追加）。第3章でたいちのバディが はな の場合、`found_empty_box` は取得できず、その周回でエンディングA・Dには到達しない。これは意図した設計。

### 第4章

| sceneId | route | art | 主なコマンド | → next |
|---|---|---|---|---|
| `ch4_finale_intro` | common | `living` | ▶推理を突き合わせる | `ch4_answer` |
| `ch4_answer` | common | `living` | （`resolveEnding` の結果でエンディングへ自動遷移） | — |
| `ch4_ending_a` | common | `living` | ▶最初から | — |
| `ch4_ending_b` | common | `living` | ▶最初から | — |
| `ch4_ending_c` | common | `living` | ▶最初から | — |
| `ch4_ending_c_delay` | common | `living` | ▶最初から | — |
| `ch4_ending_d` | common | `living` | ▶最初から | — |

`ch4_answer` は分岐専用のシーンで `commands` を持たない。`main.js` が `resolveEnding(state.flags)` を呼び、`A`→`ch4_ending_a`、`B`→`ch4_ending_b`、`D`→`ch4_ending_d`、`C` は `taichi_delay` の有無で `ch4_ending_c_delay` / `ch4_ending_c` に振り分ける。

---

## Task 1: プロジェクト骨組みと条件評価器

**Files:**
- Create: `package.json`
- Create: `src/engine.js`
- Test: `test/engine.test.js`

**Interfaces:**
- Consumes: なし
- Produces: `evaluate(condition, ctx) -> boolean`。`ctx` は `{ flags: Object<string,boolean>, counters: Object<string,number>, buddy: string, support: string, deductions: string[] }`。`condition` が `null` / `undefined` のときは `true` を返す。

- [ ] **Step 1: `package.json` を作る**

```json
{
  "name": "shiba-detective",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/*.test.js"
  }
}
```

- [ ] **Step 2: 失敗するテストを書く**

`test/engine.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/engine.js';

const ctx = (over = {}) => ({
  flags: {}, counters: {}, buddy: 'raizo', support: 'hana', deductions: [], ...over,
});

test('condition が未指定なら常に真', () => {
  assert.equal(evaluate(undefined, ctx()), true);
  assert.equal(evaluate(null, ctx()), true);
});

test('flag はフラグの有無を見る', () => {
  assert.equal(evaluate({ flag: 'evidence_mud' }, ctx()), false);
  assert.equal(evaluate({ flag: 'evidence_mud' }, ctx({ flags: { evidence_mud: true } })), true);
});

test('buddy と buddyNot はバディを見る', () => {
  assert.equal(evaluate({ buddy: 'raizo' }, ctx()), true);
  assert.equal(evaluate({ buddy: 'hana' }, ctx()), false);
  assert.equal(evaluate({ buddyNot: 'hana' }, ctx()), true);
  assert.equal(evaluate({ buddyNot: 'raizo' }, ctx()), false);
});

test('support はお留守番の犬を見る', () => {
  assert.equal(evaluate({ support: 'hana' }, ctx()), true);
  assert.equal(evaluate({ support: 'kuranosuke' }, ctx()), false);
});

test('countAtLeast はカウンタの下限を見る', () => {
  const c = ctx({ counters: { taichi_mitsumeru: 3 } });
  assert.equal(evaluate({ countAtLeast: ['taichi_mitsumeru', 3] }, c), true);
  assert.equal(evaluate({ countAtLeast: ['taichi_mitsumeru', 4] }, c), false);
  assert.equal(evaluate({ countAtLeast: ['taichi_mitsumeru', 1] }, ctx()), false);
});

test('deduction は届いた推理を見る', () => {
  assert.equal(evaluate({ deduction: 'cat' }, ctx()), false);
  assert.equal(evaluate({ deduction: 'cat' }, ctx({ deductions: ['cat'] })), true);
});

test('allOf / anyOf / not を組み合わせられる', () => {
  const c = ctx({ flags: { a: true }, buddy: 'kuranosuke' });
  assert.equal(evaluate({ allOf: [{ flag: 'a' }, { buddy: 'kuranosuke' }] }, c), true);
  assert.equal(evaluate({ allOf: [{ flag: 'a' }, { flag: 'b' }] }, c), false);
  assert.equal(evaluate({ anyOf: [{ flag: 'b' }, { buddy: 'kuranosuke' }] }, c), true);
  assert.equal(evaluate({ anyOf: [{ flag: 'b' }, { buddy: 'hana' }] }, c), false);
  assert.equal(evaluate({ not: { flag: 'b' } }, c), true);
  assert.equal(evaluate({ not: { flag: 'a' } }, c), false);
});

test('allOf が空配列なら真', () => {
  assert.equal(evaluate({ allOf: [] }, ctx()), true);
});

test('未知のキーは例外を投げる', () => {
  assert.throws(() => evaluate({ unknownKey: 'x' }, ctx()), /unknown condition/);
});
```

- [ ] **Step 3: テストが落ちることを確認**

Run: `node --test test/engine.test.js`
Expected: FAIL — `Cannot find module '../src/engine.js'`

- [ ] **Step 4: 最小実装**

`src/engine.js`:

```js
export function evaluate(condition, ctx) {
  if (condition == null) return true;

  if ('flag' in condition) return ctx.flags[condition.flag] === true;
  if ('buddy' in condition) return ctx.buddy === condition.buddy;
  if ('buddyNot' in condition) return ctx.buddy !== condition.buddyNot;
  if ('support' in condition) return ctx.support === condition.support;
  if ('deduction' in condition) return ctx.deductions.includes(condition.deduction);
  if ('countAtLeast' in condition) {
    const [name, min] = condition.countAtLeast;
    return (ctx.counters[name] ?? 0) >= min;
  }
  if ('allOf' in condition) return condition.allOf.every((c) => evaluate(c, ctx));
  if ('anyOf' in condition) return condition.anyOf.some((c) => evaluate(c, ctx));
  if ('not' in condition) return !evaluate(condition.not, ctx);

  throw new Error(`unknown condition: ${JSON.stringify(condition)}`);
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `node --test test/engine.test.js`
Expected: PASS（9 tests）

- [ ] **Step 6: コミット**

```bash
git add package.json src/engine.js test/engine.test.js
git commit -m "feat: 条件評価器 evaluate() を追加"
```

---

## Task 2: コマンド絞り込みとフラグ適用

**Files:**
- Modify: `src/engine.js`
- Modify: `test/engine.test.js`

**Interfaces:**
- Consumes: `evaluate(condition, ctx)`
- Produces:
  - `contextFor(state, route) -> ctx`（`state` から `evaluate` 用の `ctx` を組み立てる）
  - `visibleCommands(scene, state) -> Command[]`
  - `applyCommand(state, command) -> newState`（新しいオブジェクトを返す。`state` を破壊しない）
  - `DERIVED_FLAGS`（導出フラグの定義配列）

`state` の形:

```js
{
  buddies: { junko: 'raizo', taichi: 'kuranosuke' },
  supportDog: 'hana',
  sceneId: { junko: 'ch1_junko_living', taichi: 'ch1_taichi_entrance' },
  chapter: { junko: 1, taichi: 1 },
  chapterDone: { junko: false, taichi: false },
  flags: {},
  counters: {},
  deductions: [],
  ending: null,
}
```

- [ ] **Step 1: 失敗するテストを書く**

`test/engine.test.js` の末尾に追記（先頭の import を
`import { evaluate, contextFor, visibleCommands, applyCommand } from '../src/engine.js';` に変更する）:

```js
const baseState = (over = {}) => ({
  buddies: { junko: 'raizo', taichi: 'kuranosuke' },
  supportDog: 'hana',
  sceneId: { junko: 'ch1_junko_living', taichi: 'ch1_taichi_entrance' },
  chapter: { junko: 1, taichi: 1 },
  chapterDone: { junko: false, taichi: false },
  flags: {},
  counters: {},
  deductions: [],
  ending: null,
  ...over,
});

test('contextFor は route ごとのバディを載せる', () => {
  const s = baseState();
  assert.equal(contextFor(s, 'junko').buddy, 'raizo');
  assert.equal(contextFor(s, 'taichi').buddy, 'kuranosuke');
  assert.equal(contextFor(s, 'junko').support, 'hana');
});

test('visibleCommands は条件を満たすコマンドだけ返す', () => {
  const scene = {
    sceneId: 'x', route: 'taichi',
    commands: [
      { text: 'A', next: 'a' },
      { text: 'B', next: 'b', condition: { buddyNot: 'hana' } },
      { text: 'C', next: 'c', condition: { flag: 'nope' } },
    ],
  };
  const got = visibleCommands(scene, baseState()).map((c) => c.text);
  assert.deepEqual(got, ['A', 'B']);
});

test('visibleCommands は commands 未定義のシーンで空配列を返す', () => {
  assert.deepEqual(visibleCommands({ sceneId: 'x', route: 'common' }, baseState()), []);
});

test('applyCommand は setFlag を立て、シーンを進める', () => {
  const s = baseState();
  const next = applyCommand(s, { text: '', next: 'ch1_junko_sofa', setFlag: 'evidence_mud', route: 'junko' });
  assert.equal(next.flags.evidence_mud, true);
  assert.equal(next.sceneId.junko, 'ch1_junko_sofa');
  assert.equal(next.sceneId.taichi, 'ch1_taichi_entrance');
});

test('applyCommand は元の state を破壊しない', () => {
  const s = baseState();
  applyCommand(s, { next: 'x', setFlag: 'evidence_mud', route: 'junko' });
  assert.deepEqual(s.flags, {});
  assert.equal(s.sceneId.junko, 'ch1_junko_living');
});

test('applyCommand は count でカウンタを増やす', () => {
  let s = baseState();
  s = applyCommand(s, { next: 'x', count: 'taichi_mitsumeru', route: 'taichi' });
  assert.equal(s.counters.taichi_mitsumeru, 1);
  s = applyCommand(s, { next: 'y', count: 'taichi_mitsumeru', route: 'taichi' });
  assert.equal(s.counters.taichi_mitsumeru, 2);
});

test('みつめる3回で taichi_delay が導出される', () => {
  let s = baseState();
  for (let i = 0; i < 2; i++) {
    s = applyCommand(s, { next: 'x', count: 'taichi_mitsumeru', route: 'taichi' });
  }
  assert.equal(s.flags.taichi_delay, undefined);
  s = applyCommand(s, { next: 'x', count: 'taichi_mitsumeru', route: 'taichi' });
  assert.equal(s.flags.taichi_delay, true);
});

test('applyCommand は sendDeduction を deductions に積む', () => {
  const s = applyCommand(baseState(), { next: 'x', sendDeduction: 'cat', route: 'junko' });
  assert.deepEqual(s.deductions, ['cat']);
});

test('sendDeduction は重複を積まない', () => {
  let s = applyCommand(baseState(), { next: 'x', sendDeduction: 'cat', route: 'junko' });
  s = applyCommand(s, { next: 'y', sendDeduction: 'cat', route: 'junko' });
  assert.deepEqual(s.deductions, ['cat']);
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `node --test test/engine.test.js`
Expected: FAIL — `contextFor is not a function`

- [ ] **Step 3: 実装**

`src/engine.js` に追記:

```js
export const DERIVED_FLAGS = [
  { flag: 'taichi_delay', when: { countAtLeast: ['taichi_mitsumeru', 3] } },
];

export function contextFor(state, route) {
  return {
    flags: state.flags,
    counters: state.counters,
    buddy: state.buddies[route],
    support: state.supportDog,
    deductions: state.deductions,
  };
}

export function visibleCommands(scene, state) {
  if (!scene.commands) return [];
  const ctx = contextFor(state, scene.route);
  return scene.commands.filter((c) => evaluate(c.condition, ctx));
}

export function applyCommand(state, command) {
  const route = command.route;
  const flags = { ...state.flags };
  const counters = { ...state.counters };
  let deductions = state.deductions;

  if (command.setFlag) flags[command.setFlag] = true;
  if (command.count) counters[command.count] = (counters[command.count] ?? 0) + 1;
  if (command.sendDeduction && !deductions.includes(command.sendDeduction)) {
    deductions = [...deductions, command.sendDeduction];
  }

  const next = {
    ...state,
    flags,
    counters,
    deductions,
    sceneId: command.next ? { ...state.sceneId, [route]: command.next } : state.sceneId,
  };

  for (const { flag, when } of DERIVED_FLAGS) {
    if (evaluate(when, contextFor(next, route))) next.flags[flag] = true;
  }
  return next;
}
```

`command.route` は `main.js` が渡す。シーンの `route` をコマンドに引き継がせる形にすることで、`applyCommand` がシーン辞書を知らずに済む。

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/engine.test.js`
Expected: PASS（18 tests）

- [ ] **Step 5: コミット**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat: visibleCommands / applyCommand と導出フラグ"
```

---

## Task 3: エンディング判定

**Files:**
- Modify: `src/engine.js`
- Modify: `test/engine.test.js`

**Interfaces:**
- Consumes: なし（フラグ辞書のみ受ける）
- Produces: `resolveEnding(flags) -> 'A'|'B'|'C'|'D'`、`endingSceneId(ending, flags) -> string`

- [ ] **Step 1: 失敗するテストを書く**

import 行に `resolveEnding, endingSceneId` を足し、末尾に追記:

```js
test('resolveEnding: A条件のみで A', () => {
  assert.equal(resolveEnding({ suspicious_father: true, found_empty_box: true }), 'A');
});

test('resolveEnding: B条件のみで B', () => {
  assert.equal(resolveEnding({ evidence_black_hair: true, info_black_cat: true }), 'B');
});

test('resolveEnding: 両方揃うと D', () => {
  assert.equal(resolveEnding({
    suspicious_father: true, found_empty_box: true,
    evidence_black_hair: true, info_black_cat: true,
  }), 'D');
});

test('resolveEnding: 片方ずつ欠けると C', () => {
  assert.equal(resolveEnding({ suspicious_father: true, evidence_black_hair: true }), 'C');
});

test('resolveEnding: フラグ皆無でも C（詰みを作らない）', () => {
  assert.equal(resolveEnding({}), 'C');
});

test('resolveEnding: taichi_delay は判定に影響しない', () => {
  assert.equal(resolveEnding({ taichi_delay: true }), 'C');
  assert.equal(resolveEnding({ taichi_delay: true, suspicious_father: true, found_empty_box: true }), 'A');
});

test('endingSceneId: C は taichi_delay で分岐する', () => {
  assert.equal(endingSceneId('C', {}), 'ch4_ending_c');
  assert.equal(endingSceneId('C', { taichi_delay: true }), 'ch4_ending_c_delay');
  assert.equal(endingSceneId('A', { taichi_delay: true }), 'ch4_ending_a');
  assert.equal(endingSceneId('D', {}), 'ch4_ending_d');
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `node --test test/engine.test.js`
Expected: FAIL — `resolveEnding is not a function`

- [ ] **Step 3: 実装**

```js
export function resolveEnding(flags) {
  const a = flags.suspicious_father === true && flags.found_empty_box === true;
  const b = flags.evidence_black_hair === true && flags.info_black_cat === true;
  if (a && b) return 'D';
  if (a) return 'A';
  if (b) return 'B';
  return 'C';
}

export function endingSceneId(ending, flags) {
  if (ending === 'C' && flags.taichi_delay === true) return 'ch4_ending_c_delay';
  return `ch4_ending_${ending.toLowerCase()}`;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/engine.test.js`
Expected: PASS（25 tests）

- [ ] **Step 5: コミット**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat: エンディング判定 resolveEnding()（A/B/C/D）"
```

---

## Task 4: シナリオ読込・検証と第1章

**Files:**
- Create: `data/scenario.json`
- Create: `src/scenario.js`
- Test: `test/scenario.test.js`

**Interfaces:**
- Consumes: `evaluate` from `src/engine.js`
- Produces: `loadScenario(json) -> { scenes: Map<string, Scene>, meta }`、`validateScenario(scenario) -> string[]`（違反メッセージの配列。空なら健全）

- [ ] **Step 1: シナリオのスケルトンを書く**

`data/scenario.json` — 上の「シーングラフ（確定版）」の第1章の行をすべて起こす。`start` はルートごとの開始シーン。

```json
{
  "start": { "junko": "ch1_junko_living", "taichi": "ch1_taichi_entrance" },
  "feedText": {
    "evidence_mud": "じゅんこ：ソファの下に、乾いた泥の跡を見つけた",
    "evidence_black_hair": "じゅんこ：クッションの隙間から、黒くて短い毛を摘まみ上げた",
    "heard_shadow": "たいち：お母さんが、夕方に黒い影を見たと言っている",
    "suspicious_father": "たいち：お父さんの受け答えが、どうにも歯切れが悪い",
    "info_black_cat": "じゅんこ：井上肉店のおばちゃんが、黒兵衛の噂を教えてくれた",
    "info_satoru_bag": "たいち：さとる君が紙袋を提げて坂を登っていったらしい",
    "found_empty_box": "たいち：空になったお魚クッキーの箱を押さえた"
  },
  "scenes": [
    {
      "sceneId": "ch1_junko_living",
      "route": "junko",
      "chapter": 1,
      "locationName": "自宅 2階リビング",
      "art": "living",
      "description": "カーテンの隙間から西日。ローテーブルの上に、空になった皿だけが残っている。",
      "dialogue": [
        { "speaker": "じゅんこ", "text": "……お魚クッキー、まるまる一袋。犯人はこの家にいる。" }
      ],
      "supportHint": [
        { "dog": "raizo", "speaker": "雷蔵", "text": "（部屋の隅でクンクン、鼻を鳴らしている）" },
        { "dog": "hana", "speaker": "はな", "text": "（じゅんこをジロリと見て、早く探せと言いたげ）" },
        { "dog": "kuranosuke", "speaker": "蔵之介", "text": "（お腹を見せて寝ている）" }
      ],
      "commands": [
        { "text": "▶しらべる（ソファ）", "next": "ch1_junko_sofa" },
        { "text": "▶しらべる（ソファの隙間）", "next": "ch1_junko_sofa_gap", "condition": { "flag": "evidence_mud" } },
        { "text": "▶バディに頼む", "next": "ch1_junko_buddy" },
        { "text": "▶みつめる（窓の外）", "next": "ch1_junko_window" },
        { "text": "▶章を終える", "next": "ch1_junko_done", "condition": { "flag": "evidence_mud" } }
      ]
    }
  ]
}
```

残りの第1章シーン（`ch1_junko_sofa` 〜 `ch1_taichi_done`、第1章は計18シーン）をシーングラフ表どおりに書く。文体は「レトロADVの乾いた地の文＋コメディ」。`ch1_junko_done` と `ch1_taichi_done` には `"chapterEnd": true` を付け、`commands` は持たせない。

`supportHint` は**犬ごとの選択肢を並べた配列**にする。お留守番の犬はプレイごとに変わるため、単一オブジェクトでは書けない。描画側は `state.supportDog` に一致する要素を1つ選ぶ。

- [ ] **Step 2: 失敗するテストを書く**

`test/scenario.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadScenario, validateScenario } from '../src/scenario.js';

const raw = JSON.parse(readFileSync(new URL('../data/scenario.json', import.meta.url), 'utf8'));

test('シナリオが読み込める', () => {
  const s = loadScenario(raw);
  assert.ok(s.scenes.size > 0);
  assert.equal(s.scenes.get('ch1_junko_living').route, 'junko');
});

test('リンク切れ・未定義フラグ・孤立シーンがない', () => {
  assert.deepEqual(validateScenario(loadScenario(raw)), []);
});

test('validateScenario は存在しない next を検出する', () => {
  const broken = loadScenario({
    start: { junko: 'a', taichi: 'a' },
    feedText: {},
    scenes: [{ sceneId: 'a', route: 'junko', chapter: 1, commands: [{ text: 'x', next: 'nowhere' }] }],
  });
  const errors = validateScenario(broken);
  assert.ok(errors.some((e) => e.includes('nowhere')));
});

test('validateScenario は到達不能シーンを検出する', () => {
  const orphan = loadScenario({
    start: { junko: 'a', taichi: 'a' },
    feedText: {},
    scenes: [
      { sceneId: 'a', route: 'junko', chapter: 1, chapterEnd: true },
      { sceneId: 'lost', route: 'junko', chapter: 1, chapterEnd: true },
    ],
  });
  assert.ok(validateScenario(orphan).some((e) => e.includes('lost')));
});

test('validateScenario は未知のフラグ名を検出する', () => {
  const bad = loadScenario({
    start: { junko: 'a', taichi: 'a' },
    feedText: {},
    scenes: [
      { sceneId: 'a', route: 'junko', chapter: 1, commands: [{ text: 'x', next: 'b', setFlag: 'bogus_flag' }] },
      { sceneId: 'b', route: 'junko', chapter: 1, chapterEnd: true },
    ],
  });
  assert.ok(validateScenario(bad).some((e) => e.includes('bogus_flag')));
});
```

- [ ] **Step 3: テストが落ちることを確認**

Run: `node --test test/scenario.test.js`
Expected: FAIL — `Cannot find module '../src/scenario.js'`

- [ ] **Step 4: 実装**

`src/scenario.js`:

```js
export const KNOWN_FLAGS = new Set([
  'evidence_mud', 'evidence_black_hair', 'heard_shadow', 'suspicious_father',
  'info_black_cat', 'info_satoru_bag', 'found_empty_box', 'taichi_delay',
]);
export const KNOWN_COUNTERS = new Set(['taichi_mitsumeru']);

export function loadScenario(json) {
  const scenes = new Map();
  for (const scene of json.scenes) {
    if (scenes.has(scene.sceneId)) throw new Error(`duplicate sceneId: ${scene.sceneId}`);
    scenes.set(scene.sceneId, scene);
  }
  return { scenes, start: json.start, feedText: json.feedText ?? {} };
}

export function validateScenario(scenario) {
  const errors = [];
  const { scenes, start } = scenario;

  for (const [id, scene] of scenes) {
    for (const cmd of scene.commands ?? []) {
      if (!scenes.has(cmd.next)) errors.push(`${id}: next の参照先が存在しない -> ${cmd.next}`);
      if (cmd.setFlag && !KNOWN_FLAGS.has(cmd.setFlag)) errors.push(`${id}: 未知のフラグ -> ${cmd.setFlag}`);
      if (cmd.count && !KNOWN_COUNTERS.has(cmd.count)) errors.push(`${id}: 未知のカウンタ -> ${cmd.count}`);
    }
  }

  const reachable = new Set();
  const queue = [start.junko, start.taichi, 'ch4_finale_intro'].filter((id) => scenes.has(id));
  while (queue.length) {
    const id = queue.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const cmd of scenes.get(id).commands ?? []) {
      if (scenes.has(cmd.next)) queue.push(cmd.next);
    }
  }
  // エンディングシーンは main.js が直接遷移させるため、到達判定から除外する
  for (const id of scenes.keys()) {
    if (id.startsWith('ch4_ending_')) continue;
    if (!reachable.has(id)) errors.push(`到達不能なシーン: ${id}`);
  }
  return errors;
}
```

第2〜4章がまだ無い段階では、章末シーン（`chapterEnd: true`）が次章へ繋がらないのは正常。到達不能判定は開始シーンからの前方到達のみを見ているため、これで通る。

- [ ] **Step 5: テストが通ることを確認**

Run: `node --test test/scenario.test.js`
Expected: PASS（5 tests）

- [ ] **Step 6: コミット**

```bash
git add data/scenario.json src/scenario.js test/scenario.test.js
git commit -m "feat: シナリオ読込・整合性検証と第1章"
```

---

## Task 5: 第2章

**Files:**
- Modify: `data/scenario.json`
- Modify: `test/scenario.test.js`

**Interfaces:**
- Consumes: `loadScenario`, `validateScenario`
- Produces: 章末シーンの `nextChapter` フィールド（`main.js` が章送りに使う）

第1章の `ch1_junko_done` / `ch1_taichi_done` に `"nextChapter": "ch2_junko_slope"` / `"nextChapter": "ch2_taichi_station"` を足し、第2章の全19シーンを追加する。

- [ ] **Step 1: 失敗するテストを書く**

`test/scenario.test.js` に追記:

```js
test('章末シーンは nextChapter を持つ（現時点の最終章を除く）', () => {
  // データに存在する最大章より前の章末だけが nextChapter を要求される。
  // 章を1つずつ足していく開発中も、各段階でこの不変条件は成立する。
  const s = loadScenario(raw);
  const maxChapter = Math.max(...[...s.scenes.values()].map((sc) => sc.chapter ?? 0));
  for (const [id, scene] of s.scenes) {
    if (scene.chapterEnd && scene.chapter < maxChapter) {
      assert.ok(scene.nextChapter, `${id} に nextChapter がない`);
      assert.ok(s.scenes.has(scene.nextChapter), `${id}: nextChapter の参照先が存在しない`);
    }
  }
});

test('第2章の「みつめる」は2箇所あり、はなの時は出ない', () => {
  const s = loadScenario(raw);
  const lookCmds = [...s.scenes.values()]
    .flatMap((sc) => sc.commands ?? [])
    .filter((c) => c.count === 'taichi_mitsumeru');
  assert.equal(lookCmds.length, 2);
  for (const c of lookCmds) {
    assert.deepEqual(c.condition, { buddyNot: 'hana' });
  }
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `node --test test/scenario.test.js`
Expected: FAIL — `ch1_junko_done に nextChapter がない`

- [ ] **Step 3: 第2章を書く**

`validateScenario` の到達判定に章送りを含めるため、`src/scenario.js` の BFS に `nextChapter` を追加する:

```js
    for (const cmd of scenes.get(id).commands ?? []) {
      if (scenes.has(cmd.next)) queue.push(cmd.next);
    }
    const nc = scenes.get(id).nextChapter;
    if (nc && scenes.has(nc)) queue.push(nc);
```

`data/scenario.json` に第2章のシーンをシーングラフ表どおり追加する。`ch2_taichi_station_look` と `ch2_taichi_look_girl` は `count: "taichi_mitsumeru"` を **`▶みつめる` コマンド側**に持たせる（遷移先シーンではない）。

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/scenario.test.js`
Expected: PASS（7 tests）

- [ ] **Step 5: コミット**

```bash
git add data/scenario.json src/scenario.js test/scenario.test.js
git commit -m "feat: 第2章と章送り（nextChapter）"
```

---

## Task 6: 第3章（電話越しの推理）

**Files:**
- Modify: `data/scenario.json`
- Modify: `test/scenario.test.js`

**Interfaces:**
- Consumes: `evaluate` の `deduction` 条件（Task 1）、`applyCommand` の `sendDeduction`（Task 2）
- Produces: `sendDeduction` の値は `'cat' | 'hair' | 'mud'` の3種のみ

第2章の章末に `nextChapter` を足し、第3章の全16シーンを追加する。じゅんこ側の3つの「推理を送る」コマンドに `sendDeduction` を、たいち側の3つの「きく」に対応する `condition: { deduction: ... }` を付ける。

- [ ] **Step 1: 失敗するテストを書く**

```js
test('送れる推理と受け取れる推理が一対一で対応する', () => {
  const s = loadScenario(raw);
  const cmds = [...s.scenes.values()].flatMap((sc) => sc.commands ?? []);
  const sent = new Set(cmds.filter((c) => c.sendDeduction).map((c) => c.sendDeduction));
  const received = new Set(
    cmds.filter((c) => c.condition?.deduction).map((c) => c.condition.deduction)
  );
  assert.deepEqual([...sent].sort(), ['cat', 'hair', 'mud']);
  assert.deepEqual([...received].sort(), ['cat', 'hair', 'mud']);
});

test('推理を送るコマンドは対応するフラグを条件に持つ', () => {
  const s = loadScenario(raw);
  const byDeduction = Object.fromEntries(
    [...s.scenes.values()].flatMap((sc) => sc.commands ?? [])
      .filter((c) => c.sendDeduction).map((c) => [c.sendDeduction, c.condition])
  );
  assert.deepEqual(byDeduction.cat, { flag: 'info_black_cat' });
  assert.deepEqual(byDeduction.hair, { flag: 'evidence_black_hair' });
  assert.deepEqual(byDeduction.mud, { flag: 'evidence_mud' });
});

test('found_empty_box は雷蔵と蔵之介の2経路でのみ取れる', () => {
  const s = loadScenario(raw);
  const setters = [...s.scenes.values()]
    .flatMap((sc) => (sc.commands ?? []).map((c) => [sc.sceneId, c]))
    .filter(([, c]) => c.setFlag === 'found_empty_box')
    .map(([id]) => id);
  assert.deepEqual(setters.sort(), ['ch3_taichi_kuranosuke_rage', 'ch3_taichi_raizo']);
});

test('蔵之介の狂犬化は info_satoru_bag を要求する（乱数を使わない）', () => {
  const s = loadScenario(raw);
  const rage = s.scenes.get('ch3_taichi_buddy').commands
    .find((c) => c.next === 'ch3_taichi_kuranosuke_rage');
  assert.deepEqual(rage.condition, {
    allOf: [{ buddy: 'kuranosuke' }, { flag: 'info_satoru_bag' }],
  });
});
```

`found_empty_box` を立てるのは `ch3_taichi_raizo` / `ch3_taichi_kuranosuke_rage` **から出る `▶もどる` コマンド**なので、上の `setters` はその2シーンのIDになる。

- [ ] **Step 2: テストが落ちることを確認**

Run: `node --test test/scenario.test.js`
Expected: FAIL — deduction のテストが空配列で落ちる

- [ ] **Step 3: 第3章を書く**

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/scenario.test.js`
Expected: PASS（11 tests）

- [ ] **Step 5: コミット**

```bash
git add data/scenario.json test/scenario.test.js
git commit -m "feat: 第3章と電話越しの推理（sendDeduction）"
```

---

## Task 7: 第4章と4つのエンディング、到達可能性の証明

**Files:**
- Modify: `data/scenario.json`
- Modify: `test/scenario.test.js`

**Interfaces:**
- Consumes: `resolveEnding`, `endingSceneId`（Task 3）、`applyCommand`, `visibleCommands`（Task 2）
- Produces: なし（最終章）

第3章の章末に `nextChapter: "ch4_finale_intro"` を足し、第4章の7シーンを書く。エンディングDの本文は設計書§4.5の「三頭とも真相を知りながら黙っていた」線で執筆する。

このタスクの核は**到達可能性テスト**である。全6通りのバディ配分について、シーングラフを総当り探索し、どのエンディングに到達しうるかを機械的に確かめる。

- [ ] **Step 1: 失敗するテストを書く**

```js
import { visibleCommands, applyCommand, resolveEnding } from '../src/engine.js';

const BUDDY_ASSIGNMENTS = [
  ['raizo', 'hana'], ['raizo', 'kuranosuke'],
  ['hana', 'raizo'], ['hana', 'kuranosuke'],
  ['kuranosuke', 'raizo'], ['kuranosuke', 'hana'],
];

// あるバディ配分で到達しうるフラグ集合をすべて列挙する（フラグは単調増加なので有限）
function reachableFlagSets(scenario, junkoBuddy, taichiBuddy) {
  const dogs = ['raizo', 'hana', 'kuranosuke'];
  const support = dogs.find((d) => d !== junkoBuddy && d !== taichiBuddy);
  const initial = {
    buddies: { junko: junkoBuddy, taichi: taichiBuddy },
    supportDog: support,
    sceneId: { ...scenario.start },
    chapter: { junko: 1, taichi: 1 },
    chapterDone: { junko: false, taichi: false },
    flags: {}, counters: {}, deductions: [], ending: null,
  };

  const seen = new Set();
  const results = new Set();
  const stack = [initial];

  // カウンタは 3 で頭打ちにする。taichi_delay の導出は 3 以上で同じ挙動になるため、
  // 4回目以降を別状態として数えると探索が停止しない。
  const key = (s) =>
    JSON.stringify([
      s.sceneId,
      Object.keys(s.flags).sort(),
      Object.fromEntries(Object.entries(s.counters).map(([k, v]) => [k, Math.min(v, 3)])),
      [...s.deductions].sort(),
    ]);

  while (stack.length) {
    const s = stack.pop();
    const k = key(s);
    if (seen.has(k)) continue;
    seen.add(k);
    results.add(JSON.stringify(Object.keys(s.flags).sort()));

    for (const route of ['junko', 'taichi']) {
      const scene = scenario.scenes.get(s.sceneId[route]);
      if (!scene) continue;
      if (scene.chapterEnd) {
        if (scene.nextChapter && scenario.scenes.has(scene.nextChapter)) {
          stack.push({ ...s, sceneId: { ...s.sceneId, [route]: scene.nextChapter } });
        }
        continue;
      }
      for (const cmd of visibleCommands(scene, s)) {
        stack.push(applyCommand(s, { ...cmd, route }));
      }
    }
  }
  return [...results].map((r) => JSON.parse(r));
}

function endingsFor(scenario, junkoBuddy, taichiBuddy) {
  const set = new Set();
  for (const flagList of reachableFlagSets(scenario, junkoBuddy, taichiBuddy)) {
    const flags = Object.fromEntries(flagList.map((f) => [f, true]));
    set.add(resolveEnding(flags));
  }
  return set;
}

test('エンディングシーンが4種そろっている（Cの派生を含めて5）', () => {
  const s = loadScenario(raw);
  for (const id of ['ch4_ending_a', 'ch4_ending_b', 'ch4_ending_c', 'ch4_ending_c_delay', 'ch4_ending_d']) {
    assert.ok(s.scenes.has(id), `${id} が無い`);
  }
});

test('たいちが雷蔵か蔵之介なら A・B・C・D すべてに到達できる', () => {
  const s = loadScenario(raw);
  for (const [j, t] of BUDDY_ASSIGNMENTS.filter(([, t]) => t !== 'hana')) {
    const got = endingsFor(s, j, t);
    for (const e of ['A', 'B', 'C', 'D']) {
      assert.ok(got.has(e), `バディ(${j}/${t}) でエンディング ${e} に到達できない`);
    }
  }
});

test('たいちがはなの時は found_empty_box が取れず、A・D に到達しない', () => {
  const s = loadScenario(raw);
  for (const [j, t] of BUDDY_ASSIGNMENTS.filter(([, t]) => t === 'hana')) {
    const got = endingsFor(s, j, t);
    assert.ok(!got.has('A'), `バディ(${j}/${t}) で A に到達してしまう`);
    assert.ok(!got.has('D'), `バディ(${j}/${t}) で D に到達してしまう`);
    assert.ok(got.has('B'), `バディ(${j}/${t}) で B に到達できない`);
    assert.ok(got.has('C'), `バディ(${j}/${t}) で C に到達できない`);
  }
});

test('taichi_delay はどのバディ配分でも「みつめる」が出る時だけ立つ', () => {
  const s = loadScenario(raw);
  const withHana = reachableFlagSets(s, 'raizo', 'hana');
  assert.ok(!withHana.some((fs) => fs.includes('taichi_delay')));
  const withRaizo = reachableFlagSets(s, 'hana', 'raizo');
  assert.ok(withRaizo.some((fs) => fs.includes('taichi_delay')));
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `node --test test/scenario.test.js`
Expected: FAIL — `ch4_ending_a が無い`

- [ ] **Step 3: 第4章を書く**

`ch4_answer` は `commands` を持たず、`"resolvesEnding": true` を付ける。

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/scenario.test.js`
Expected: PASS（15 tests）。探索は数秒で終わる。もし停止しない場合は `key()` のカウンタ丸めが効いていない。

- [ ] **Step 5: コミット**

```bash
git add data/scenario.json test/scenario.test.js
git commit -m "feat: 第4章と4エンディング、到達可能性テスト"
```

---

## Task 8: 状態の生成と localStorage 退避

**Files:**
- Create: `src/state.js`
- Test: `test/state.test.js`

**Interfaces:**
- Consumes: なし
- Produces: `createState({ buddies, supportDog, start }) -> state`、`saveState(state, storage)`、`loadState(storage) -> state | null`、`clearState(storage)`。`storage` は `localStorage` 互換（`getItem`/`setItem`/`removeItem`）。テストではプレーンオブジェクトで代用する。

- [ ] **Step 1: 失敗するテストを書く**

`test/state.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, saveState, loadState, clearState, STORAGE_KEY } from '../src/state.js';

const fakeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
};

test('createState はお留守番の犬を自動で決める', () => {
  const s = createState({
    buddies: { junko: 'raizo', taichi: 'kuranosuke' },
    start: { junko: 'a', taichi: 'b' },
  });
  assert.equal(s.supportDog, 'hana');
  assert.deepEqual(s.flags, {});
  assert.deepEqual(s.chapter, { junko: 1, taichi: 1 });
  assert.equal(s.ending, null);
});

test('createState は同じ犬を2人が選ぶと例外', () => {
  assert.throws(
    () => createState({ buddies: { junko: 'raizo', taichi: 'raizo' }, start: { junko: 'a', taichi: 'b' } }),
    /same buddy/
  );
});

test('save してから load すると同じ state が返る', () => {
  const st = fakeStorage();
  const s = createState({ buddies: { junko: 'hana', taichi: 'raizo' }, start: { junko: 'a', taichi: 'b' } });
  s.flags.evidence_mud = true;
  saveState(s, st);
  assert.deepEqual(loadState(st), s);
});

test('保存が無ければ load は null', () => {
  assert.equal(loadState(fakeStorage()), null);
});

test('壊れたJSONが入っていても load は null を返す', () => {
  const st = fakeStorage();
  st.setItem(STORAGE_KEY, '{ broken');
  assert.equal(loadState(st), null);
});

test('clearState で消える', () => {
  const st = fakeStorage();
  saveState(createState({ buddies: { junko: 'hana', taichi: 'raizo' }, start: { junko: 'a', taichi: 'b' } }), st);
  clearState(st);
  assert.equal(loadState(st), null);
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `node --test test/state.test.js`
Expected: FAIL — `Cannot find module '../src/state.js'`

- [ ] **Step 3: 実装**

`src/state.js`:

```js
export const STORAGE_KEY = 'shiba_detective_state';
export const DOGS = ['raizo', 'hana', 'kuranosuke'];

export function createState({ buddies, start }) {
  if (buddies.junko === buddies.taichi) throw new Error('same buddy chosen by both players');
  const supportDog = DOGS.find((d) => d !== buddies.junko && d !== buddies.taichi);
  return {
    buddies: { ...buddies },
    supportDog,
    sceneId: { ...start },
    chapter: { junko: 1, taichi: 1 },
    chapterDone: { junko: false, taichi: false },
    flags: {},
    counters: {},
    deductions: [],
    ending: null,
  };
}

export function saveState(state, storage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearState(storage) {
  storage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/state.test.js`
Expected: PASS（6 tests）

- [ ] **Step 5: 全テストを走らせる**

Run: `node --test test/*.test.js`
Expected: PASS（46 tests）

- [ ] **Step 6: コミット**

```bash
git add src/state.js test/state.test.js
git commit -m "feat: ゲーム状態の生成と localStorage 退避"
```

---

## Task 9: SVGドット絵

**Files:**
- Create: `src/ui/art.js`

**Interfaces:**
- Consumes: なし
- Produces: `art(id) -> string`（SVG文字列を返す。未知のIDは空の枠を返す）、`ART_IDS`（配列）

- [ ] **Step 1: 実装**

`src/ui/art.js`。10枚（場所7 + 犬3）。すべて `viewBox="0 0 160 100"`、`shape-rendering="crispEdges"`、色は `currentColor` のみ使い、CSS変数 `--phosphor` で着色されるようにする（緑/アンバー/白の切替が効く）。

```js
const wrap = (body) =>
  `<svg viewBox="0 0 160 100" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img">${body}</svg>`;

const S = {
  living: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <rect x="20" y="52" width="60" height="28" fill="none" stroke="currentColor"/>
    <rect x="24" y="44" width="14" height="8" fill="none" stroke="currentColor"/>
    <rect x="44" y="44" width="14" height="8" fill="none" stroke="currentColor"/>
    <rect x="100" y="20" width="40" height="30" fill="none" stroke="currentColor"/>
    <line x1="120" y1="20" x2="120" y2="50" stroke="currentColor"/>
    <rect x="96" y="66" width="44" height="4" fill="currentColor"/>`,
  entrance: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <rect x="56" y="24" width="48" height="72" fill="none" stroke="currentColor"/>
    <circle cx="96" cy="60" r="2" fill="currentColor"/>
    <rect x="24" y="84" width="16" height="6" fill="none" stroke="currentColor"/>
    <rect x="120" y="84" width="16" height="6" fill="none" stroke="currentColor"/>`,
  slope: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <path d="M4 88 L156 40" fill="none" stroke="currentColor"/>
    <path d="M4 96 L156 48" fill="none" stroke="currentColor"/>
    <rect x="30" y="52" width="18" height="24" fill="none" stroke="currentColor"/>
    <rect x="70" y="38" width="18" height="24" fill="none" stroke="currentColor"/>
    <rect x="110" y="24" width="18" height="24" fill="none" stroke="currentColor"/>`,
  nikuten: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <rect x="20" y="16" width="120" height="14" fill="none" stroke="currentColor"/>
    <text x="80" y="27" font-size="9" text-anchor="middle" fill="currentColor" font-family="monospace">INOUE</text>
    <rect x="28" y="48" width="104" height="34" fill="none" stroke="currentColor"/>
    <circle cx="50" cy="64" r="6" fill="none" stroke="currentColor"/>
    <circle cx="70" cy="64" r="6" fill="none" stroke="currentColor"/>
    <circle cx="90" cy="64" r="6" fill="none" stroke="currentColor"/>`,
  shimabaraya: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <path d="M20 34 L80 12 L140 34" fill="none" stroke="currentColor"/>
    <rect x="28" y="34" width="104" height="52" fill="none" stroke="currentColor"/>
    <rect x="44" y="52" width="24" height="34" fill="none" stroke="currentColor"/>
    <rect x="92" y="52" width="24" height="20" fill="none" stroke="currentColor"/>`,
  station: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <rect x="16" y="30" width="128" height="40" fill="none" stroke="currentColor"/>
    <line x1="16" y1="78" x2="144" y2="78" stroke="currentColor"/>
    <line x1="16" y1="86" x2="144" y2="86" stroke="currentColor"/>
    <rect x="60" y="42" width="40" height="28" fill="none" stroke="currentColor"/>`,
  kichi: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <line x1="4" y1="72" x2="156" y2="72" stroke="currentColor"/>
    <rect x="16" y="40" width="30" height="32" fill="none" stroke="currentColor"/>
    <rect x="56" y="28" width="30" height="44" fill="none" stroke="currentColor"/>
    <rect x="96" y="46" width="30" height="26" fill="none" stroke="currentColor"/>
    <line x1="140" y1="20" x2="140" y2="72" stroke="currentColor"/>
    <circle cx="140" cy="18" r="3" fill="currentColor"/>`,
  raizo: dogFace('RAIZO', 'sharp'),
  hana: dogFace('HANA', 'calm'),
  kuranosuke: dogFace('KURANOSUKE', 'wide'),
};

function dogFace(name, mood) {
  const eyes =
    mood === 'sharp' ? `<rect x="56" y="44" width="10" height="4" fill="currentColor"/><rect x="94" y="44" width="10" height="4" fill="currentColor"/>`
    : mood === 'calm' ? `<rect x="56" y="44" width="10" height="6" fill="currentColor"/><rect x="94" y="44" width="10" height="6" fill="currentColor"/>`
    : `<circle cx="61" cy="46" r="4" fill="currentColor"/><circle cx="99" cy="46" r="4" fill="currentColor"/>`;
  return `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <path d="M46 40 L54 18 L68 34" fill="none" stroke="currentColor"/>
    <path d="M114 40 L106 18 L92 34" fill="none" stroke="currentColor"/>
    <ellipse cx="80" cy="56" rx="34" ry="30" fill="none" stroke="currentColor"/>
    ${eyes}
    <rect x="74" y="62" width="12" height="6" fill="currentColor"/>
    <path d="M80 68 L80 74 M80 74 Q72 80 66 74 M80 74 Q88 80 94 74" fill="none" stroke="currentColor"/>
    <text x="80" y="94" font-size="7" text-anchor="middle" fill="currentColor" font-family="monospace">${name}</text>`;
}

export const ART_IDS = Object.keys(S);
export function art(id) {
  return wrap(S[id] ?? `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>`);
}
```

- [ ] **Step 2: シナリオが参照する art IDがすべて存在することをテストする**

`test/scenario.test.js` に追記:

```js
import { ART_IDS } from '../src/ui/art.js';

test('シナリオの art はすべて実在する', () => {
  const s = loadScenario(raw);
  for (const [id, scene] of s.scenes) {
    if (scene.art) assert.ok(ART_IDS.includes(scene.art), `${id}: 未知の art -> ${scene.art}`);
  }
});
```

- [ ] **Step 3: テストが通ることを確認**

Run: `node --test test/*.test.js`
Expected: PASS（48 tests）

- [ ] **Step 4: コミット**

```bash
git add src/ui/art.js test/scenario.test.js
git commit -m "feat: SVGドット絵10枚（場所7・犬3）"
```

---

## Task 10: タイプライタ

**Files:**
- Create: `src/ui/typewriter.js`
- Test: `test/typewriter.test.js`

**Interfaces:**
- Consumes: なし
- Produces: `typewriter(text, { onChar, onDone, delay, now, schedule }) -> { skip() }`。`schedule` と `now` を差し替え可能にしてテストから時間を制御する。既定は `setTimeout` と `Date.now`。

- [ ] **Step 1: 失敗するテストを書く**

`test/typewriter.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typewriter } from '../src/ui/typewriter.js';

// schedule を即時実行に差し替えると、同期的に全文が流れる
const immediate = (fn) => { fn(); return 0; };

test('1文字ずつ onChar が呼ばれ、最後に onDone', () => {
  const chars = [];
  let done = false;
  typewriter('あいう', { onChar: (c) => chars.push(c), onDone: () => { done = true; }, schedule: immediate });
  assert.deepEqual(chars, ['あ', 'い', 'う']);
  assert.equal(done, true);
});

test('サロゲートペアを壊さない', () => {
  const chars = [];
  typewriter('🐕柴', { onChar: (c) => chars.push(c), onDone: () => {}, schedule: immediate });
  assert.deepEqual(chars, ['🐕', '柴']);
});

test('skip() で残りを一気に流し、onDone を1度だけ呼ぶ', () => {
  const chars = [];
  let doneCount = 0;
  const pending = [];
  const deferred = (fn) => { pending.push(fn); return pending.length; };
  const t = typewriter('あいうえお', { onChar: (c) => chars.push(c), onDone: () => doneCount++, schedule: deferred });
  pending.shift()();          // 「あ」だけ流す
  assert.deepEqual(chars, ['あ']);
  t.skip();
  assert.deepEqual(chars, ['あ', 'い', 'う', 'え', 'お']);
  assert.equal(doneCount, 1);
  t.skip();                   // 2度目の skip は無視される
  assert.equal(doneCount, 1);
});

test('空文字は即 onDone', () => {
  let done = false;
  typewriter('', { onChar: () => assert.fail('呼ばれてはいけない'), onDone: () => { done = true; }, schedule: immediate });
  assert.equal(done, true);
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `node --test test/typewriter.test.js`
Expected: FAIL — `Cannot find module '../src/ui/typewriter.js'`

- [ ] **Step 3: 実装**

```js
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
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/typewriter.test.js`
Expected: PASS（4 tests）

- [ ] **Step 5: コミット**

```bash
git add src/ui/typewriter.js test/typewriter.test.js
git commit -m "feat: タイプライタ表示（skip対応・サロゲートペア安全）"
```

---

## Task 11: 3ペインの描画とレトロスタイル

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `src/ui/screen.js`

**Interfaces:**
- Consumes: `art(id)`（Task 9）、`typewriter`（Task 10）、`visibleCommands`（Task 2）
- Produces: `renderStatus(el, { locationName, buddyLabel, routeLabel })`、`renderArt(el, artId)`、`renderDialogue(el, lines, { onDone })`、`renderCommands(el, commands, onPick)`、`appendFeed(el, text)`

- [ ] **Step 1: `index.html` を書く**

```html
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>柴犬探偵団 〜リビングに消ゆ〜</title>
<link rel="manifest" href="manifest.json">
<link rel="stylesheet" href="style.css">
</head>
<body data-phosphor="green">
  <div id="scanlines" aria-hidden="true"></div>

  <main id="game" hidden>
    <header id="status">
      <span id="status-location"></span>
      <span id="status-buddy"></span>
      <span id="status-route"></span>
    </header>
    <section id="art" aria-label="場面"></section>
    <section id="dialogue" aria-live="polite"></section>
    <footer id="commands">
      <p class="label">【コマンド】</p>
      <ol id="command-list"></ol>
    </footer>
    <aside id="feed" aria-live="polite" aria-label="相棒からの報せ"></aside>
  </main>

  <section id="lobby">
    <h1>柴犬探偵団<small>〜リビングに消ゆ〜</small></h1>
    <div id="lobby-body"></div>
  </section>

  <button id="phosphor-toggle" type="button">COLOR</button>
  <button id="sound-toggle" type="button" aria-pressed="false">SOUND OFF</button>

  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: `style.css` を書く**

黒背景・等幅・蛍光モノクローム。`--phosphor` を `body[data-phosphor]` で切り替える。

```css
:root { --bg: #000; --phosphor: #33ff66; --dim: color-mix(in srgb, var(--phosphor) 45%, #000); }
body[data-phosphor="amber"] { --phosphor: #ffb000; }
body[data-phosphor="white"] { --phosphor: #e8e8e8; }

* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--phosphor);
  font-family: "MS Gothic", "Osaka-Mono", "Courier New", monospace;
  font-size: clamp(13px, 2.4vw, 16px); line-height: 1.7;
  min-height: 100dvh;
}
#scanlines {
  position: fixed; inset: 0; pointer-events: none; z-index: 10;
  background: repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,.28) 2px 4px);
}
#game { display: grid; grid-template-rows: auto 1fr auto auto; gap: 0; max-width: 760px; margin: 0 auto; min-height: 100dvh; }
#status, #dialogue, #commands, #art { border: 1px solid var(--phosphor); margin: -1px 0 0; padding: .6em .9em; }
#status { display: flex; flex-wrap: wrap; gap: 1.2em; font-size: .85em; }
#art { display: grid; place-items: center; padding: 1em; }
#art svg { width: min(100%, 420px); height: auto; color: var(--phosphor); }
#dialogue { min-height: 7.5em; }
#dialogue p { margin: 0 0 .3em; }
#dialogue .speaker::after { content: "「"; }
#dialogue .speaker::before { content: ""; }
#dialogue .line-end::after { content: "」"; }
#dialogue .narration { color: var(--dim); }
#commands .label { margin: 0 0 .3em; }
#command-list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .4em .9em; }
#command-list button {
  background: none; border: 1px solid var(--phosphor); color: inherit;
  font: inherit; padding: .25em .7em; cursor: pointer;
}
#command-list button:hover, #command-list button:focus-visible { background: var(--phosphor); color: var(--bg); outline: none; }
#feed { font-size: .8em; color: var(--dim); padding: .4em .9em; min-height: 2.4em; }
#feed p { margin: 0; }
#phosphor-toggle, #sound-toggle {
  position: fixed; bottom: .6em; z-index: 20; background: var(--bg); color: var(--phosphor);
  border: 1px solid var(--phosphor); font: inherit; font-size: .72em; padding: .2em .6em; cursor: pointer;
}
#phosphor-toggle { right: .6em; } #sound-toggle { right: 6.4em; }
#lobby { max-width: 620px; margin: 0 auto; padding: 2em 1em; }
#lobby h1 { font-weight: normal; letter-spacing: .1em; }
#lobby h1 small { display: block; font-size: .55em; color: var(--dim); }
@media (prefers-reduced-motion: reduce) { #scanlines { display: none; } }
```

- [ ] **Step 3: `src/ui/screen.js` を書く**

```js
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
export function renderDialogue(el, lines, { onDone } = {}) {
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
    active = typewriter(text, { onChar: (c) => { body.textContent += c; }, onDone: next });
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
```

- [ ] **Step 4: 手で確認する**

Run: `python3 -m http.server 8767` して `http://localhost:8767` を開く。
Expected: ロビーの見出しが緑の等幅で表示され、スキャンラインが乗る。`COLOR` ボタンはまだ動かない（Task 12）。

- [ ] **Step 5: コミット**

```bash
git add index.html style.css src/ui/screen.js
git commit -m "feat: 3ペインUIとPC-8800風スタイル"
```

---

## Task 12: 1人プレイの通し（プレイアブルなマイルストーン）

**Files:**
- Create: `src/main.js`
- Create: `.claude/launch.json`

**Interfaces:**
- Consumes: 全エンジン関数、`createState`/`saveState`/`loadState`、`screen.js` の描画関数、`loadScenario`
- Produces: `window` に何も生やさない。`main.js` は副作用のみ。

このタスクを終えた時点で、**Firebaseなしで全4章・全エンディングを1人で通せる**。設計書§7が要求するフォールバック経路そのものなので、後のタスクで捨てない。

- [ ] **Step 1: `.claude/launch.json` を書く**

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "shiba-detective", "runtimeExecutable": "python3", "runtimeArgs": ["-m", "http.server", "8767"], "port": 8767 }
  ]
}
```

- [ ] **Step 2: `src/main.js` を書く**

ロビー → バディ選択（1人プレイでは2頭を続けて選ぶ）→ 本編 → エンディング。

```js
import { loadScenario } from './scenario.js';
import { createState, saveState, loadState, clearState, DOGS } from './state.js';
import { visibleCommands, applyCommand, resolveEnding, endingSceneId } from './engine.js';
import { renderStatus, renderArt, renderDialogue, renderCommands, appendFeed } from './ui/screen.js';

const DOG_LABEL = { raizo: '雷蔵', hana: 'はな', kuranosuke: '蔵之介' };
const ROUTE_LABEL = { junko: 'じゅんこ', taichi: 'たいち', common: '一同' };

const el = {
  game: document.getElementById('game'),
  lobby: document.getElementById('lobby'),
  lobbyBody: document.getElementById('lobby-body'),
  status: document.getElementById('status'),
  art: document.getElementById('art'),
  dialogue: document.getElementById('dialogue'),
  commandList: document.getElementById('command-list'),
  feed: document.getElementById('feed'),
};

const scenario = loadScenario(await fetch('data/scenario.json').then((r) => r.json()));

let state = null;
let route = 'junko';      // 1人プレイで現在操作している視点
let typing = null;

function currentScene() {
  return scenario.scenes.get(state.sceneId[route]);
}

function draw() {
  const scene = currentScene();
  renderStatus(el.status, {
    locationName: scene.locationName ?? '—',
    buddyLabel: scene.route === 'common' ? '三頭' : DOG_LABEL[state.buddies[scene.route]],
    routeLabel: ROUTE_LABEL[scene.route],
  });
  renderArt(el.art, scene.art);

  const lines = [];
  if (scene.description) lines.push({ text: scene.description });
  for (const d of scene.dialogue ?? []) lines.push(d);
  const hint = scene.supportHint?.find((h) => h.dog === state.supportDog);
  if (hint) lines.push({ speaker: hint.speaker, text: hint.text });

  renderCommands(el.commandList, [], () => {});
  typing = renderDialogue(el.dialogue, lines, { onDone: drawCommands });
}

function drawCommands() {
  const scene = currentScene();

  if (scene.resolvesEnding) {
    state = { ...state, ending: resolveEnding(state.flags) };
    state.sceneId[route] = endingSceneId(state.ending, state.flags);
    saveState(state, localStorage);
    return draw();
  }

  if (scene.chapterEnd) {
    const cmds = [];
    if (scene.nextChapter) {
      cmds.push({ text: '▶次の章へ', next: scene.nextChapter, route });
    }
    cmds.push(...switchRouteCommand());
    return renderCommands(el.commandList, cmds, pick);
  }

  if (scene.sceneId.startsWith('ch4_ending_')) {
    return renderCommands(el.commandList, [{ text: '▶最初から', restart: true }], pick);
  }

  const cmds = visibleCommands(scene, state).map((c) => ({ ...c, route: scene.route }));
  renderCommands(el.commandList, [...cmds, ...switchRouteCommand()], pick);
}

/** 1人プレイ専用: もう一方の視点へ切り替える。第4章（common）では出さない。 */
function switchRouteCommand() {
  if (currentScene().route === 'common') return [];
  const other = route === 'junko' ? 'taichi' : 'junko';
  return [{ text: `▶視点を${ROUTE_LABEL[other]}に切り替える`, switchTo: other }];
}

function pick(cmd) {
  if (cmd.restart) {
    clearState(localStorage);
    return location.reload();
  }
  if (cmd.switchTo) {
    route = cmd.switchTo;
    return draw();
  }

  const before = new Set(Object.keys(state.flags));
  state = applyCommand(state, cmd);
  syncChapters();
  saveState(state, localStorage);

  for (const f of Object.keys(state.flags)) {
    if (!before.has(f) && scenario.feedText[f]) appendFeed(el.feed, scenario.feedText[f]);
  }

  if (bothChapterEnded()) enterFinale();
  else draw();
}

/** chapter はシーンから導出する。createState の初期値以降、ここだけが更新する。 */
function syncChapters() {
  for (const r of ['junko', 'taichi']) {
    const scene = scenario.scenes.get(state.sceneId[r]);
    if (scene?.chapter) state.chapter[r] = scene.chapter;
    state.chapterDone[r] = scene?.chapterEnd === true;
  }
}

/** 両者が第3章の章末に立っている時だけ合流する。1〜2章の章末では合流しない。 */
function bothChapterEnded() {
  return ['junko', 'taichi'].every(
    (r) => state.chapterDone[r] && state.chapter[r] >= 3
  );
}

function enterFinale() {
  state.sceneId.junko = 'ch4_finale_intro';
  state.sceneId.taichi = 'ch4_finale_intro';
  syncChapters();
  saveState(state, localStorage);
  draw();
}

// ---- ロビー（1人プレイ: バディを2頭とも選ぶ） ----
function showLobby() {
  el.lobbyBody.innerHTML = '';
  const picks = {};

  const askFor = (r) => {
    const h = document.createElement('p');
    h.textContent = `${ROUTE_LABEL[r]}のバディを選んでください。`;
    el.lobbyBody.append(h);
    for (const dog of DOGS) {
      if (Object.values(picks).includes(dog)) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = DOG_LABEL[dog];
      b.addEventListener('click', () => {
        picks[r] = dog;
        el.lobbyBody.innerHTML = '';
        if (r === 'junko') askFor('taichi');
        else start(picks);
      });
      el.lobbyBody.append(b);
    }
  };
  askFor('junko');
}

function start(buddies) {
  state = createState({ buddies, start: scenario.start });
  saveState(state, localStorage);
  el.lobby.hidden = true;
  el.game.hidden = false;
  draw();
}

// ---- 起動 ----
const saved = loadState(localStorage);
if (saved) {
  state = saved;
  el.lobby.hidden = true;
  el.game.hidden = false;
  draw();
} else {
  showLobby();
}

// ---- キーボード ----
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    typing?.skip();
    return;
  }
  const n = Number(e.key);
  if (Number.isInteger(n) && n >= 1) {
    el.commandList.querySelectorAll('button')[n - 1]?.click();
  }
});

// ---- 蛍光色の切替 ----
const PHOSPHORS = ['green', 'amber', 'white'];
document.getElementById('phosphor-toggle').addEventListener('click', () => {
  const i = PHOSPHORS.indexOf(document.body.dataset.phosphor);
  document.body.dataset.phosphor = PHOSPHORS[(i + 1) % PHOSPHORS.length];
  localStorage.setItem('shiba_detective_phosphor', document.body.dataset.phosphor);
});
document.body.dataset.phosphor = localStorage.getItem('shiba_detective_phosphor') ?? 'green';
```

第4章の合流条件は「両ルートが章末シーンに立っている」こと。1人プレイでは視点を切り替えて両方を章末まで進めれば合流する。

- [ ] **Step 3: ブラウザで通しプレイして確認**

`preview_start` で `shiba-detective` を起動し、以下を実際に確かめる。

1. バディ選択で雷蔵→蔵之介と選ぶ（お留守番が「はな」になること）
2. じゅんこで `▶しらべる（ソファ）`→泥。feedに「ソファの下に、乾いた泥の跡」が出ること
3. `▶しらべる（ソファの隙間）` が泥取得後に**初めて出現**すること
4. 視点切替→たいち→父に聞く→feedが更新されること
5. 章末→次の章へ、を4章まで繰り返し、`ch4_answer` からエンディングDに着地すること
6. 数字キー1〜5で選択できること、Spaceで文字送りがスキップされること

- [ ] **Step 4: コミット**

```bash
git add src/main.js .claude/launch.json
git commit -m "feat: 1人プレイで全4章を通せるようにする"
```

---

## Task 13: 効果音

**Files:**
- Create: `src/ui/sound.js`
- Modify: `src/main.js`
- Modify: `src/ui/screen.js`

**Interfaces:**
- Consumes: なし
- Produces: `createSound() -> { enabled, toggle(), blip(), jingle() }`。初期は `enabled: false`。

- [ ] **Step 1: `src/ui/sound.js` を書く**

```js
export function createSound() {
  let ctx = null;
  let enabled = false;

  const ensure = () => (ctx ??= new (window.AudioContext ?? window.webkitAudioContext)());

  const tone = (freq, ms, gainValue = 0.03) => {
    if (!enabled) return;
    const ac = ensure();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + ms / 1000);
  };

  return {
    get enabled() { return enabled; },
    toggle() { enabled = !enabled; if (enabled) ensure(); return enabled; },
    blip() { tone(880, 12); },
    jingle() { [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 90, 0.05), i * 90)); },
  };
}
```

音量は 0.03 と控えめ。`AudioContext` はユーザー操作（トグル押下）まで作らない — ブラウザの自動再生ポリシーに抵触するため。

- [ ] **Step 2: `screen.js` の `renderDialogue` に `onChar` フックを足す**

```js
export function renderDialogue(el, lines, { onDone, onChar } = {}) {
```

`typewriter` の `onChar` の中で `onChar?.()` を呼ぶ。

- [ ] **Step 3: `main.js` に配線する**

```js
import { createSound } from './ui/sound.js';
const sound = createSound();

const soundBtn = document.getElementById('sound-toggle');
soundBtn.addEventListener('click', () => {
  const on = sound.toggle();
  soundBtn.textContent = on ? 'SOUND ON' : 'SOUND OFF';
  soundBtn.setAttribute('aria-pressed', String(on));
});
```

`renderDialogue` 呼び出しに `onChar: () => sound.blip()` を、フラグ取得時（`appendFeed` を呼ぶ箇所）に `sound.jingle()` を足す。

- [ ] **Step 4: ブラウザで確認**

`SOUND OFF` の状態で文字送りしても無音であること。押して `SOUND ON` にすると文字送り音が鳴り、フラグ取得でジングルが鳴ること。

- [ ] **Step 5: コミット**

```bash
git add src/ui/sound.js src/ui/screen.js src/main.js
git commit -m "feat: WebAudio の効果音（初期オフ）"
```

---

## Task 14: Firebase 初期化とセキュリティルール

**Files:**
- Create: `src/net/firebase.js`
- Create: `database.rules.json`
- Create: `src/net/firebase-config.js`

**Interfaces:**
- Consumes: なし
- Produces: `initFirebase() -> Promise<{ db, uid } | null>`（失敗時は `null` を返し、例外を投げない）

**先にユーザーが行う手動作業:** Firebase コンソールで新規プロジェクト `shiba-detective` を作成し、Realtime Database（asia-southeast1 または asia-northeast1）を有効化、Authentication で「匿名」プロバイダを有効化する。取得した設定を `src/net/firebase-config.js` に書く。

- [ ] **Step 1: `src/net/firebase-config.js` を書く**

```js
export const firebaseConfig = {
  apiKey: '<コンソールの値>',
  authDomain: '<project>.firebaseapp.com',
  databaseURL: 'https://<project>-default-rtdb.<region>.firebasedatabase.app',
  projectId: '<project>',
  appId: '<コンソールの値>',
};
```

これはコミットしてよい。RTDBの保護はセキュリティルールで行うものであり、`apiKey` は秘密情報ではない（ShibaCare と同じ方針）。

- [ ] **Step 2: `database.rules.json` を書く**

```json
{
  "rules": {
    "rooms": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null && (!data.exists() || data.child('expiresAt').val() > now)",
        ".validate": "newData.hasChildren(['createdAt', 'expiresAt', 'phase'])",
        "expiresAt": { ".validate": "newData.isNumber() && newData.val() <= now + 86400000" }
      }
    }
  }
}
```

失効したルームは書き込めなくなる（読みは可能で、クライアントが「失効」と表示する）。`expiresAt` に24時間より先の値は入れられない。

- [ ] **Step 3: `src/net/firebase.js` を書く**

```js
import { firebaseConfig } from './firebase-config.js';

const CDN = 'https://www.gstatic.com/firebasejs/10.12.2';

/** 失敗しても例外を投げず null を返す。呼び出し側は1人プレイにフォールバックする。 */
export async function initFirebase() {
  try {
    const [{ initializeApp }, { getAuth, signInAnonymously }, dbMod] = await Promise.all([
      import(`${CDN}/firebase-app.js`),
      import(`${CDN}/firebase-auth.js`),
      import(`${CDN}/firebase-database.js`),
    ]);
    const app = initializeApp(firebaseConfig);
    const cred = await signInAnonymously(getAuth(app));
    return { db: dbMod.getDatabase(app), uid: cred.user.uid, api: dbMod };
  } catch (err) {
    console.warn('Firebase 初期化に失敗。1人プレイで続行します。', err);
    return null;
  }
}
```

- [ ] **Step 4: 手で確認**

ブラウザのコンソールで `import('./src/net/firebase.js').then(m => m.initFirebase()).then(console.log)` を実行。
Expected: `{ db: ..., uid: "..." }` が出る。設定が空のままなら `null` が出て警告が1本出る（フォールバックが機能している証拠）。

- [ ] **Step 5: コミット**

```bash
git add src/net/firebase.js src/net/firebase-config.js database.rules.json
git commit -m "feat: Firebase 初期化（匿名認証）とRTDBルール"
```

---

## Task 15: ルームの作成・参加・購読

**Files:**
- Create: `src/net/room.js`
- Test: `test/room.test.js`

**Interfaces:**
- Consumes: `initFirebase()` の戻り値 `{ db, uid, api }`
- Produces:
  - `generateCode(rand) -> string`（4桁。`rand` は `() => number`、既定 `Math.random`）
  - `roomPayload(state, { uid, now }) -> object`（RTDBに書く形へ変換。純粋関数）
  - `mergeRemote(localState, remote) -> newState`（純粋関数。フラグは和集合、カウンタは最大値、`deductions` は和集合）
  - `createRoom(conn, code, state)` / `joinRoom(conn, code)` / `watchRoom(conn, code, onChange)` / `claimBuddy(conn, code, route, dog) -> Promise<boolean>`

純粋関数（`generateCode` / `roomPayload` / `mergeRemote`）だけをテストする。Firebase 呼び出し部分は Task 16 のブラウザ確認で見る。

- [ ] **Step 1: 失敗するテストを書く**

`test/room.test.js`:

```js
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
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `node --test test/room.test.js`
Expected: FAIL — `Cannot find module '../src/net/room.js'`

- [ ] **Step 3: 実装**

`src/net/room.js`:

```js
const DAY_MS = 86400000;

export function generateCode(rand = Math.random) {
  return String(Math.floor(rand() * 10000)).padStart(4, '0');
}

export function roomPayload(state, { uid, now = Date.now() }) {
  return {
    createdAt: now,
    expiresAt: now + DAY_MS,
    phase: 'playing',
    supportDog: state.supportDog,
    ending: state.ending,
    flags: state.flags,
    counters: state.counters,
    deductions: state.deductions,
    players: {
      junko: { buddy: state.buddies.junko, sceneId: state.sceneId.junko, chapter: state.chapter.junko, chapterDone: state.chapterDone.junko },
      taichi: { buddy: state.buddies.taichi, sceneId: state.sceneId.taichi, chapter: state.chapter.taichi, chapterDone: state.chapterDone.taichi },
    },
    hostUid: uid,
  };
}

/** フラグは単調増加なので和集合、カウンタは最大値を採る。競合しない。 */
export function mergeRemote(state, remote = {}) {
  const flags = { ...state.flags, ...(remote.flags ?? {}) };

  const counters = { ...state.counters };
  for (const [k, v] of Object.entries(remote.counters ?? {})) {
    counters[k] = Math.max(counters[k] ?? 0, v);
  }

  const deductions = [...new Set([...state.deductions, ...(remote.deductions ?? [])])];

  const sceneId = { ...state.sceneId };
  const chapter = { ...state.chapter };
  const chapterDone = { ...state.chapterDone };
  for (const r of ['junko', 'taichi']) {
    const p = remote.players?.[r];
    if (!p) continue;
    if (p.sceneId) sceneId[r] = p.sceneId;
    if (p.chapter) chapter[r] = p.chapter;
    if (typeof p.chapterDone === 'boolean') chapterDone[r] = p.chapterDone;
  }

  return { ...state, flags, counters, deductions, sceneId, chapter, chapterDone,
    ending: remote.ending ?? state.ending };
}

export async function createRoom(conn, code, state) {
  const { api, db, uid } = conn;
  await api.set(api.ref(db, `rooms/${code}`), roomPayload(state, { uid }));
}

export async function joinRoom(conn, code) {
  const { api, db } = conn;
  const snap = await api.get(api.ref(db, `rooms/${code}`));
  if (!snap.exists()) throw new Error('ルームが見つかりません');
  const room = snap.val();
  if (room.expiresAt <= Date.now()) throw new Error('このルームは期限切れです');
  return room;
}

export function watchRoom(conn, code, onChange) {
  const { api, db } = conn;
  return api.onValue(api.ref(db, `rooms/${code}`), (snap) => {
    if (snap.exists()) onChange(snap.val());
  });
}

/** 二人が同時に同じ犬を押した時の唯一の競合。取れたら true。 */
export async function claimBuddy(conn, code, route, dog) {
  const { api, db } = conn;
  const result = await api.runTransaction(
    api.ref(db, `rooms/${code}/players/${route}/buddy`),
    (current) => (current == null ? dog : undefined)   // undefined を返すと中断
  );
  return result.committed && result.snapshot.val() === dog;
}

export async function pushState(conn, code, state) {
  const { api, db } = conn;
  await api.update(api.ref(db, `rooms/${code}`), {
    flags: state.flags,
    counters: state.counters,
    deductions: state.deductions,
    ending: state.ending,
    [`players/junko/sceneId`]: state.sceneId.junko,
    [`players/junko/chapter`]: state.chapter.junko,
    [`players/junko/chapterDone`]: state.chapterDone.junko,
    [`players/taichi/sceneId`]: state.sceneId.taichi,
    [`players/taichi/chapter`]: state.chapter.taichi,
    [`players/taichi/chapterDone`]: state.chapterDone.taichi,
  });
}
```

`claimBuddy` は相手が既に確保していれば `undefined` を返してトランザクションを中断する。これが設計書§5.2の競合対策。

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test test/room.test.js`
Expected: PASS（8 tests）

- [ ] **Step 5: 全テスト**

Run: `node --test test/*.test.js`
Expected: PASS（56 tests）

- [ ] **Step 6: コミット**

```bash
git add src/net/room.js test/room.test.js
git commit -m "feat: ルーム作成/参加/購読とバディ選択トランザクション"
```

---

## Task 16: 2人プレイの統合

**Files:**
- Modify: `src/main.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `initFirebase`、`createRoom`/`joinRoom`/`watchRoom`/`claimBuddy`/`pushState`/`mergeRemote`/`generateCode`
- Produces: なし

ロビーを「ひとりで遊ぶ / 部屋を作る / 部屋に入る」の3択にする。Firebase が `null` を返したら「ひとりで遊ぶ」だけを出す。

- [ ] **Step 1: ロビーを3択にする**

`index.html` の `#lobby-body` に、モード選択・4桁コード入力・ルームコード表示のマークアップを足す。

- [ ] **Step 2: `main.js` に接続状態を持たせる**

```js
import { initFirebase } from './net/firebase.js';
import { createRoom, joinRoom, watchRoom, claimBuddy, pushState, mergeRemote, generateCode } from './net/room.js';

let conn = null;          // null なら1人プレイ
let roomCode = null;
let myRoute = null;       // 2人プレイで自分が操作する側。1人プレイでは null

conn = await initFirebase();
```

`pick()` の末尾に、2人プレイ時のみ走る同期を足す。

```js
  if (conn && roomCode) pushState(conn, roomCode, state).catch(() => {/* 断線時はローカルで続行 */});
```

購読側。**自分のルートの `sceneId` は上書きしない**（自分の操作が巻き戻るため）。

```js
function startWatching() {
  watchRoom(conn, roomCode, (remote) => {
    const beforeFlags = new Set(Object.keys(state.flags));
    const beforeDeductions = state.deductions.length;
    const mine = state.sceneId[myRoute];   // 自分のシーンは相手に上書きさせない

    state = mergeRemote(state, remote);
    state.sceneId[myRoute] = mine;
    syncChapters();
    saveState(state, localStorage);

    for (const f of Object.keys(state.flags)) {
      if (!beforeFlags.has(f) && scenario.feedText[f]) {
        appendFeed(el.feed, scenario.feedText[f]);
        sound.jingle();
      }
    }

    if (bothChapterEnded()) return enterFinale();
    // 相手の推理が届いた時だけコマンドを引き直す。自分のシーンは動いていないので draw() はしない
    if (state.deductions.length !== beforeDeductions) drawCommands();
  });
}
```

- [ ] **Step 3: 2人プレイでは視点切替コマンドを出さない**

```js
function switchRouteCommand() {
  if (conn && roomCode) return [];              // 2人プレイでは自分の視点に固定
  if (currentScene().route === 'common') return [];
  const other = route === 'junko' ? 'taichi' : 'junko';
  return [{ text: `▶視点を${ROUTE_LABEL[other]}に切り替える`, switchTo: other }];
}
```

2人プレイでは `route = myRoute` を固定する。

- [ ] **Step 4: 離脱耐性を入れる**

`chapterEnd` に到達したのに相手が第4章に来ない場合、45秒後に「▶ひとりで結論を出す」を出す。押すと `ch4_finale_intro` へ単独で進む。設計書§5.5。

```js
function waitForPartner() {
  const timer = setTimeout(() => {
    renderCommands(el.commandList, [
      { text: '▶ひとりで結論を出す', soloFinale: true },
    ], pick);
  }, 45000);
  return () => clearTimeout(timer);
}
```

`pick()` に `if (cmd.soloFinale) return enterFinale();` を足す。

- [ ] **Step 5: バディ選択をトランザクションにする**

2人プレイのロビーでは、`claimBuddy` が `false` を返した犬をボタンから消し、「その子は相手が連れて行きました」と出す。

- [ ] **Step 6: 2台のブラウザで確認**

`preview_start` でサーバーを立て、通常ウィンドウとシークレットウィンドウで開く。

1. 片方で「部屋を作る」→4桁コードが出る。もう片方で「部屋に入る」→そのコードを入れて参加できる
2. 両方で同じ犬（雷蔵）を押す → 片方だけが取れ、もう片方には「相手が連れて行きました」が出る
3. じゅんこ側でソファを調べる → **たいち側の画面のfeedに**「じゅんこ：ソファの下に、乾いた泥の跡を見つけた」が1〜2秒以内に出る
4. 第3章でじゅんこが「推理を送る（黒猫の話）」→ たいち側のコマンドに「▶きく（黒猫を見なかったか）」が**増える**
5. 両方が第3章の章末に達すると、両方の画面が `ch4_finale_intro` に切り替わる
6. 片方のタブを閉じる → 残った側に45秒後「▶ひとりで結論を出す」が出る
7. DevTools の Network を Offline にしてもコマンド選択が続けられ、Online に戻すと相手に反映される

- [ ] **Step 7: コミット**

```bash
git add src/main.js index.html
git commit -m "feat: ルームコードによる2人同時プレイ"
```

---

## Task 17: PWA と公開

**Files:**
- Create: `manifest.json`
- Create: `sw.js`
- Create: `README.md`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: なし
- Produces: なし

- [ ] **Step 1: `manifest.json` を書く**

```json
{
  "name": "柴犬探偵団 〜リビングに消ゆ〜",
  "short_name": "柴犬探偵団",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [{ "src": "icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }]
}
```

`icon.svg` は `art('raizo')` の出力を 512×512 に収めたものを手で保存する。

- [ ] **Step 2: `sw.js` を書く**

```js
const CACHE = 'shiba-detective-v1';
const ASSETS = [
  './', './index.html', './style.css', './manifest.json', './icon.svg',
  './data/scenario.json',
  './src/main.js', './src/engine.js', './src/state.js', './src/scenario.js',
  './src/ui/screen.js', './src/ui/art.js', './src/ui/typewriter.js', './src/ui/sound.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Firebase と CDN はキャッシュしない（常にネットワーク）
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then((hit) => hit ?? fetch(e.request)));
});
```

`src/net/*` は意図的にキャッシュ対象外。オフライン時は `initFirebase()` が `null` を返して1人プレイに落ちる。

- [ ] **Step 3: `main.js` に Service Worker 登録を足す**

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {/* 失敗しても遊べる */});
}
```

- [ ] **Step 4: `README.md` を書く**

タイトル、遊び方（1人／2人）、ローカル起動手順（`python3 -m http.server 8767`）、テスト実行（`node --test test/*.test.js`）、Firebase セットアップ手順、原典仕様書へのリンク、設計書へのリンク。

- [ ] **Step 5: 全テストと最終確認**

Run: `node --test test/*.test.js`
Expected: PASS（56 tests）

ブラウザで DevTools > Application > Service Workers に登録が出ること。Offline にしてリロードしてもロビーが表示され、1人プレイが始められること。

- [ ] **Step 6: コミット**

```bash
git add manifest.json sw.js icon.svg README.md src/main.js
git commit -m "feat: PWA対応とREADME"
```

- [ ] **Step 7: 公開（ユーザーの手動作業）**

GitHub で `shiba-detective` リポジトリを作成し、`git remote add origin` して push。Settings > Pages で `main` ブランチのルートを公開に設定。Firebase コンソールの Authentication > 承認済みドメインに `<user>.github.io` を追加する（追加を忘れると本番で匿名認証が落ち、常に1人プレイになる）。

---

## Self-Review

**Spec coverage:**

| 設計書のセクション | 対応タスク |
|---|---|
| §2 技術構成 | 1, 14, 17 |
| §3 ローカルファースト＋ミラー | 15, 16 |
| §4.1 データ形式 | 4 |
| §4.2 条件式（オブジェクト化） | 1 |
| §4.3 エンジンAPI | 1, 2, 3 |
| §4.4 フラグとカウンタ（`taichi_delay` 導出） | 2, 5 |
| §4.5 エンディング判定 A/B/C/D | 3, 7 |
| §4.6 犬の固有コマンド・狂犬化の確定条件 | 6 |
| §4.7 サポート犬の割り込み | 4（`supportHint`）, 12（描画） |
| §5.1 RTDBデータ形 | 15 |
| §5.2 バディ選択トランザクション | 15, 16 |
| §5.3 feed | 4（`feedText`）, 12, 16 |
| §5.4 電話越しの推理 | 6, 16 |
| §5.5 第4章ゲートと離脱耐性 | 16 |
| §6.1 3ペイン・キーボード操作 | 11, 12 |
| §6.2 レトロ表現（蛍光3色・スキャンライン・SVG） | 9, 11, 12 |
| §6.2 音（初期オフ） | 13 |
| §7 ファイル構成 | 全タスク |
| §7 scenario.test.js の3検証 | 4（リンク切れ・到達不能）, 7（エンディング到達可能性） |
| §7 エラー処理（断線・失効・初期化失敗フォールバック） | 14, 15, 16 |
| §7 PWA | 17 |

漏れなし。

**Placeholder scan:** `firebase-config.js` の `<コンソールの値>` は、ユーザーが Firebase コンソールから取得するまで確定しない値であり、Task 14 の冒頭に取得手順を明記している。これは実装者が埋められない外部依存であってプレースホルダーではない。他に TBD / TODO なし。

**Type consistency:**
- `evaluate(condition, ctx)` の `ctx` は Task 1 で定義し、Task 2 の `contextFor` が生成する。キー名 `flags`/`counters`/`buddy`/`support`/`deductions` は一致。
- `applyCommand(state, command)` は `command.route` を要求する。呼び出し側（Task 12 の `pick`、Task 7 のテスト）はいずれも `{ ...cmd, route }` を渡している。一致。
- `endingSceneId(ending, flags)` の戻り値 `ch4_ending_a` 〜 `ch4_ending_d` と `ch4_ending_c_delay` は、Task 7 のシーンID、`validateScenario` の除外条件（`id.startsWith('ch4_ending_')`）と一致。
- `mergeRemote` が読む `remote.players[r].sceneId` は `roomPayload` が書く形と一致。
- `state` の形は Task 2、Task 8 の `createState`、Task 15 の `base()` で同一。
