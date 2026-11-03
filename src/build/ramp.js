/** Painted value ramp on walls and roofs: darker at the foot of a storey, full colour at its top. */
export const RAMP = { base: 0.72 };

/** Brightness factor for a height `y` (level-local metres) within a storey of `storeyHeight`. */
export function heightRamp(y, storeyHeight) {
  const t = Math.min(1, Math.max(0, y / storeyHeight));
  const eased = t * t * (3 - 2 * t);
  return RAMP.base + (1 - RAMP.base) * eased;
}
