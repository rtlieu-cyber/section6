const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi"];

/** Short human-readable form of a (possibly huge) number, e.g. 12.3M. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  if (value < 1000) {
    return value > 0 && value < 10 && !Number.isInteger(value)
      ? value.toFixed(1)
      : Math.floor(value).toString();
  }
  const tier = Math.min(
    Math.floor(Math.log10(value) / 3),
    SUFFIXES.length - 1,
  );
  const scaled = value / 1000 ** tier;
  const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return `${scaled.toFixed(digits)}${SUFFIXES[tier]}`;
}
