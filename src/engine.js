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

export const DERIVED_FLAGS = [
  { flag: 'taichi_delay', route: 'taichi', when: { countAtLeast: ['taichi_mitsumeru', 3] } },
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
  return scene.commands
    .filter((c) => evaluate(c.condition, ctx))
    .map((c) => ({ ...c, route: scene.route }));
}

const VALID_ROUTES = ['junko', 'taichi', 'common'];

export function applyCommand(state, command) {
  const route = command.route;
  if (!VALID_ROUTES.includes(route)) {
    throw new Error(
      `applyCommand: command.route must be 'junko', 'taichi', or 'common' (got ${JSON.stringify(route)})`
    );
  }
  if (command.next && route === 'common') {
    throw new Error(
      "applyCommand: command.route 'common' cannot be combined with command.next"
    );
  }

  const flags = { ...state.flags };
  const counters = { ...state.counters };
  let deductions = [...state.deductions];

  if (command.setFlag) flags[command.setFlag] = true;
  if (command.count) counters[command.count] = (counters[command.count] ?? 0) + 1;
  if (command.sendDeduction && !deductions.includes(command.sendDeduction)) {
    deductions = [...deductions, command.sendDeduction];
  }

  const sceneId = command.next
    ? { ...state.sceneId, [route]: command.next }
    : { ...state.sceneId };

  const next = {
    ...state,
    flags,
    counters,
    deductions,
    sceneId,
  };

  for (const { flag, route: flagRoute, when } of DERIVED_FLAGS) {
    if (evaluate(when, contextFor(next, flagRoute))) next.flags[flag] = true;
  }
  return next;
}

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
