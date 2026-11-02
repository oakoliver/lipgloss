/**
 * Colour downsampling, ported from charmbracelet/x/ansi `Convert256` and
 * `Convert16` (with go-colorful's HSLuv distance), as used by colorprofile.
 *
 * The result matches Go built for amd64, which does not fuse multiplies and
 * subtractions. Go built for arm64 fuses `col.R*255 - 35` into one FMA
 * instruction and so differs from this on a few hundred colours out of every
 * seventy thousand; this port follows the unfused arithmetic.
 */

/** x/ansi's ansi256To16: the 16-colour equivalent of each xterm 256-colour index. */
const ANSI256_TO_16: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0, 4, 4, 4, 12, 12, 2, 6, 4, 4, 12, 12, 2, 2, 6, 4,
  12, 12, 2, 2, 2, 6, 12, 12, 10, 10, 10, 10, 14, 12, 10, 10, 10, 10, 10, 14, 1, 5, 4, 4, 12, 12, 3, 8, 4, 4, 12, 12,
  2, 2, 6, 4, 12, 12, 2, 2, 2, 6, 12, 12, 10, 10, 10, 10, 14, 12, 10, 10, 10, 10, 10, 14, 1, 1, 5, 4, 12, 12,
  1, 1, 5, 4, 12, 12, 3, 3, 8, 4, 12, 12, 2, 2, 2, 6, 12, 12, 10, 10, 10, 10, 14, 12, 10, 10, 10, 10, 10, 14, 1, 1,
  1, 5, 12, 12, 1, 1, 1, 5, 12, 12, 1, 1, 1, 5, 12, 12, 3, 3, 3, 7, 12, 12, 10, 10, 10, 10, 14, 12, 10, 10, 10, 10,
  10, 14, 9, 9, 9, 9, 13, 12, 9, 9, 9, 9, 13, 12, 9, 9, 9, 9, 13, 12, 9, 9, 9, 9, 13, 12, 11, 11, 11, 11, 7, 12,
  10, 10, 10, 10, 10, 14, 9, 9, 9, 9, 9, 13, 9, 9, 9, 9, 9, 13, 9, 9, 9, 9, 9, 13, 9, 9, 9, 9, 9, 13, 9, 9,
  9, 9, 9, 13, 11, 11, 11, 11, 11, 15, 0, 0, 0, 0, 0, 0, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 7, 15, 15, 15, 15,
  15, 15,
];

// go-colorful's HSLuv, used by Convert256 to choose between the cube and the greys.
const HSLUV_D65 = [0.95045592705167, 1.0, 1.089057750759878] as const;
const HSLUV_M = [
  [3.2409699419045214, -1.5373831775700935, -0.49861076029300328],
  [-0.96924363628087983, 1.8759675015077207, 0.041555057407175613],
  [0.055630079696993609, -0.20397695888897657, 1.0569715142428786],
] as const;
const KAPPA = 903.2962962962963;
const EPSILON = 0.0088564516790356308;

const sq = (v: number) => v * v;
const clamp01 = (v: number) => Math.max(0, Math.min(v, 1));

function linearize(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function xyzToUv(x: number, y: number, z: number): [number, number] {
  const denom = x + 15.0 * y + 3.0 * z;
  return denom === 0 ? [0, 0] : [(4.0 * x) / denom, (9.0 * y) / denom];
}

function maxChromaForLH(l: number, h: number): number {
  const hRad = (h / 360.0) * Math.PI * 2.0;
  const sub1 = Math.pow(l + 16.0, 3.0) / 1560896.0;
  const sub2 = sub1 > EPSILON ? sub1 : l / KAPPA;
  let minLength = Number.MAX_VALUE;
  for (const m of HSLUV_M) {
    for (let k = 0; k < 2; k++) {
      const top1 = (284517.0 * m[0] - 94839.0 * m[2]) * sub2;
      const top2 = (838422.0 * m[2] + 769860.0 * m[1] + 731718.0 * m[0]) * l * sub2 - 769860.0 * k * l;
      const bottom = (632260.0 * m[2] - 126452.0 * m[1]) * sub2 + 126452.0 * k;
      const length = top2 / bottom / (Math.sin(hRad) - (top1 / bottom) * Math.cos(hRad));
      if (length > 0.0 && length < minLength) minLength = length;
    }
  }
  return minLength;
}

/** HSLuv of an sRGB colour with channels in [0, 1]. */
function hsluv(r: number, g: number, b: number): [number, number, number] {
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);
  const x = 0.41239079926595948 * lr + 0.35758433938387796 * lg + 0.18048078840183429 * lb;
  const y = 0.21263900587151036 * lr + 0.71516867876775593 * lg + 0.072192315360733715 * lb;
  const z = 0.019330818715591851 * lr + 0.11919477979462599 * lg + 0.95053215224966058 * lb;

  // XYZ to Luv with the HSLuv white reference.
  const [wx, wy, wz] = HSLUV_D65;
  // Go folds the constants exactly: (6/29)³ = 216/24389 and (29/3)³ = 24389/27.
  const L = y / wy <= 216 / 24389 ? ((y / wy) * (24389 / 27)) / 100.0 : 1.16 * Math.cbrt(y / wy) - 0.16;
  const [ubis, vbis] = xyzToUv(x, y, z);
  const [un, vn] = xyzToUv(wx, wy, wz);
  const u = 13.0 * L * (ubis - un);
  const v = 13.0 * L * (vbis - vn);

  // Luv to LCh.
  const h = Math.abs(v - u) > 1e-4 && Math.abs(u) > 1e-4 ? (57.29577951308232087721 * Math.atan2(v, u) + 360.0) % 360.0 : 0.0;
  const c = Math.sqrt(sq(u) + sq(v));

  // LCh to HSLuv.
  const c100 = c * 100.0;
  const l100 = L * 100.0;
  const s = l100 > 99.9999999 || l100 < 0.00000001 ? 0.0 : (c100 / maxChromaForLH(l100, h)) * 100.0;
  return [h, clamp01(s / 100.0), clamp01(l100 / 100.0)];
}

function distanceHSLuv(a: [number, number, number], b: [number, number, number]): number {
  const [h1, s1, l1] = hsluv(...a);
  const [h2, s2, l2] = hsluv(...b);
  return Math.sqrt(sq((h1 - h2) / 100.0) + sq(s1 - s2) + sq(l1 - l2));
}

function to6Cube(v: number): number {
  if (v < 48) return 0;
  if (v < 115) return 1;
  return Math.trunc((v - 35) / 40);
}

/**
 * Converts a 24-bit colour to the xterm 256-colour palette, as x/ansi's
 * `Convert256`: the nearest of the 6×6×6 cube and the 24 greys, compared by
 * HSLuv distance.
 */
export function convert256(r8: number, g8: number, b8: number): number {
  // colorful.MakeColor: 8-bit channels widened to 16 bits, then scaled to [0, 1].
  const col: [number, number, number] = [(r8 * 257) / 65535, (g8 * 257) / 65535, (b8 * 257) / 65535];
  const r = col[0] * 255;
  const g = col[1] * 255;
  const b = col[2] * 255;

  const q2c = [0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff];
  const qr = to6Cube(r);
  const qg = to6Cube(g);
  const qb = to6Cube(b);
  const cr = q2c[qr]!;
  const cg = q2c[qg]!;
  const cb = q2c[qb]!;

  const ci = 36 * qr + 6 * qg + qb;
  if (cr === Math.trunc(r) && cg === Math.trunc(g) && cb === Math.trunc(b)) return 16 + ci;

  const greyAvg = Math.trunc(Math.trunc(r + g + b) / 3);
  const greyIdx = greyAvg > 238 ? 23 : Math.trunc((greyAvg - 3) / 10);
  const grey = 8 + 10 * greyIdx;

  const colorDist = distanceHSLuv(col, [cr / 255.0, cg / 255.0, cb / 255.0]);
  const grayDist = distanceHSLuv(col, [grey / 255.0, grey / 255.0, grey / 255.0]);
  return colorDist <= grayDist ? 16 + ci : 232 + greyIdx;
}

/** Converts an xterm 256-colour index to the 16 ANSI colours, as x/ansi's `Convert16`. */
export function convert16(index: number): number {
  return ANSI256_TO_16[index] ?? 0;
}
