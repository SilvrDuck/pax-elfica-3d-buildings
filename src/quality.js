/** What each quality level turns on. Low is for integrated GPUs that cannot hold 60 fps. */
export const QUALITY = {
  high: { bloom: true, shadows: true },
  low: { bloom: false, shadows: false },
};

const SAMPLES = 60;
const SLOW_MS = 25; // 40 fps

export function parseQuality(text) {
  return text in QUALITY ? text : 'high';
}

/**
 * True when the last SAMPLES frame times (ms) are steadily slow: the median is under 40 fps, so a
 * single hiccup does not trigger it.
 */
export function shouldDowngrade(frameTimes) {
  if (frameTimes.length < SAMPLES) return false;
  const recent = frameTimes.slice(-SAMPLES).sort((a, b) => a - b);
  return recent[Math.floor(recent.length / 2)] > SLOW_MS;
}
