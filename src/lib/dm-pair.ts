export function normalizePair(a: string, b: string): [string, string] {
  if (a === b) throw new Error("cannot DM yourself");
  return a < b ? [a, b] : [b, a];
}
