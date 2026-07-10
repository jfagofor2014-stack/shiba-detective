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
