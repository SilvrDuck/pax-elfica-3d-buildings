// Binary morphology on Uint8Array masks (1 = set) with a (2r+1) square structuring element,
// done as two separable running-window passes.

function pass(input, lines, lineLen, lineStride, step, r, isMin) {
  const out = new Uint8Array(input.length);
  for (let line = 0; line < lines; line++) {
    const base = line * lineStride;
    let count = 0;
    const window = [];
    for (let i = -r; i < lineLen; i++) {
      const add = i + r;
      if (add < lineLen) { const v = input[base + add * step]; window.push(v); count += v; }
      if (i - r - 1 >= 0) count -= window.shift();
      if (i >= 0) out[base + i * step] = isMin ? (count === window.length ? 1 : 0) : (count > 0 ? 1 : 0);
    }
  }
  return out;
}

export function erode(mask, width, height, r) {
  const rows = pass(mask, height, width, width, 1, r, true);
  return pass(rows, width, height, 1, width, r, true);
}

export function dilate(mask, width, height, r) {
  const rows = pass(mask, height, width, width, 1, r, false);
  return pass(rows, width, height, 1, width, r, false);
}

/** Opening: removes features thinner than 2r+1. */
export function open(mask, width, height, r) {
  return dilate(erode(mask, width, height, r), width, height, r);
}

/** Closing: fills gaps and holes narrower than 2r+1. */
export function close(mask, width, height, r) {
  return erode(dilate(mask, width, height, r), width, height, r);
}
