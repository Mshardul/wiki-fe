/** Prefix numeric (or leading +) clocks with "t = "; pass through labels like "fix". */
export function mechanismClockLabel(clock: string): string {
  return /^[\d+]/.test(clock) ? `t = ${clock}` : clock;
}
