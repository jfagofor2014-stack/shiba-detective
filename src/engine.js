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
