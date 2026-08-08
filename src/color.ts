/**
 * Color types and utilities for terminal styling.
 */

import type { ColorValue } from './ansi.js';

/**
 * Represents no color — terminal default.
 */
export const NO_COLOR: unique symbol = Symbol('NoColor');
export type NoColor = typeof NO_COLOR;

/**
 * RGB color representation.
 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
  /** Alpha channel on a 0-255 scale. Omitted means fully opaque. */
  a?: number;
}

/**
 * A color that can be used in styling.
 * - null/undefined/NO_COLOR = no color (terminal default)
 * - number 0-15 = ANSI basic color
 * - number 16-255 = ANSI 256 color
 * - string "#RRGGBB" or "#RGB" = hex color
 * - RGBColor = explicit RGB
 */
export type Color = string | number | RGBColor | NoColor | null | undefined;

/** ANSI basic color constants (0-15) */
export const Black = 0;
export const Red = 1;
export const Green = 2;
export const Yellow = 3;
export const Blue = 4;
export const Magenta = 5;
export const Cyan = 6;
export const White = 7;
export const BrightBlack = 8;
export const BrightRed = 9;
export const BrightGreen = 10;
export const BrightYellow = 11;
export const BrightBlue = 12;
export const BrightMagenta = 13;
export const BrightCyan = 14;
export const BrightWhite = 15;

/**
 * Parse a color specification into an internal ColorValue.
 * Returns null for "no color".
 */
export function parseColor(c: Color): ColorValue | null {
  if (c === null || c === undefined || c === NO_COLOR) return null;

  if (typeof c === 'number') {
    if (c < 0) c = -c;
    if (c < 16) return { type: 'basic', value: c };
    if (c < 256) return { type: 'ansi256', value: c };
    // Treat as packed RGB: 0xRRGGBB
    return {
      type: 'rgb',
      value: 0,
      r: (c >> 16) & 0xff,
      g: (c >> 8) & 0xff,
      b: c & 0xff,
    };
  }

  if (typeof c === 'string') {
    if (c.startsWith('#')) {
      const rgb = parseHex(c);
      if (!rgb) return null;
      return { type: 'rgb', value: 0, ...rgb };
    }
    if (/^[+-]?\d+$/.test(c)) {
      return parseColor(Number(c));
    }
    return null;
  }

  // RGBColor object
  if (typeof c === 'object' && 'r' in c && 'g' in c && 'b' in c) {
    return { type: 'rgb', value: 0, r: c.r, g: c.g, b: c.b };
  }

  return null;
}

/**
 * Parse a hex color string (#RGB or #RRGGBB) into RGB values.
 */
export function parseHex(hex: string): RGBColor | null {
  if (!hex.startsWith('#')) return null;

  if (hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }

  if (hex.length === 4) {
    const r = parseInt(hex[1], 16) * 17;
    const g = parseInt(hex[2], 16) * 17;
    const b = parseInt(hex[3], 16) * 17;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }

  return null;
}

/**
 * Convert any Color to RGB values (approximation for ANSI colors).
 */
export function colorToRGB(c: Color): RGBColor | null {
  const cv = parseColor(c);
  if (!cv) return null;
  if (cv.type === 'rgb') return { r: cv.r!, g: cv.g!, b: cv.b! };
  if (cv.type === 'ansi256') return ansi256ToRGB(cv.value);
  if (cv.type === 'basic') return ansi256ToRGB(cv.value);
  return null;
}

/** Standard ANSI 16 color palette (approximate RGB values) */
const ANSI_16_COLORS: RGBColor[] = [
  { r: 0, g: 0, b: 0 },
  { r: 128, g: 0, b: 0 },
  { r: 0, g: 128, b: 0 },
  { r: 128, g: 128, b: 0 },
  { r: 0, g: 0, b: 128 },
  { r: 128, g: 0, b: 128 },
  { r: 0, g: 128, b: 128 },
  { r: 192, g: 192, b: 192 },
  { r: 128, g: 128, b: 128 },
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 255, b: 0 },
  { r: 255, g: 255, b: 0 },
  { r: 0, g: 0, b: 255 },
  { r: 255, g: 0, b: 255 },
  { r: 0, g: 255, b: 255 },
  { r: 255, g: 255, b: 255 },
];

/**
 * Convert ANSI 256 color index to approximate RGB.
 */
export function ansi256ToRGB(index: number): RGBColor {
  if (index < 16) return ANSI_16_COLORS[index];

  if (index < 232) {
    // 6x6x6 color cube
    const i = index - 16;
    const r = Math.floor(i / 36);
    const g = Math.floor((i % 36) / 6);
    const b = i % 6;
    return {
      r: r ? r * 40 + 55 : 0,
      g: g ? g * 40 + 55 : 0,
      b: b ? b * 40 + 55 : 0,
    };
  }

  // Grayscale (232-255)
  const v = (index - 232) * 10 + 8;
  return { r: v, g: v, b: v };
}

/**
 * Determine if a color is "dark" based on luminance.
 */
export function isDarkColor(c: Color): boolean {
  const rgb = colorToRGB(c);
  if (!rgb) return true;
  // HSL lightness approximation
  const max = Math.max(rgb.r, rgb.g, rgb.b) / 255;
  const min = Math.min(rgb.r, rgb.g, rgb.b) / 255;
  const l = (max + min) / 2;
  return l < 0.5;
}

/**
 * LightDark returns a function that picks a color based on background darkness.
 */
export function lightDark(isDark: boolean): (light: Color, dark: Color) => Color {
  return (light: Color, dark: Color) => isDark ? dark : light;
}

/**
 * Returns the complementary color (180 degrees on the color wheel).
 */
export function complementary(c: Color): Color {
  const rgb = colorToRGB(c);
  if (!rgb) return null;

  // Convert to HSV, rotate hue 180 degrees, convert back
  const { h, s, v } = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const newH = (h + 180) % 360;
  const result = hsvToRgb(newH, s, v);
  return result;
}

/**
 * Darken a color by a percentage (0-1).
 */
export function darken(c: Color, percent: number): Color {
  const rgb = colorToRGB(c);
  if (!rgb) return null;
  const mult = 1 - clamp(percent, 0, 1);
  return {
    r: Math.trunc(rgb.r * mult),
    g: Math.trunc(rgb.g * mult),
    b: Math.trunc(rgb.b * mult),
    a: typeof c === 'object' && c && 'a' in c ? c.a : 255,
  };
}

/**
 * Lighten a color by adding the requested fraction of the full channel range.
 */
export function lighten(c: Color, percent: number): Color {
  const rgb = colorToRGB(c);
  if (!rgb) return null;
  const add = 255 * clamp(percent, 0, 1);
  return {
    r: Math.min(255, Math.trunc(rgb.r + add)),
    g: Math.min(255, Math.trunc(rgb.g + add)),
    b: Math.min(255, Math.trunc(rgb.b + add)),
    a: typeof c === 'object' && c && 'a' in c ? c.a : 255,
  };
}

/**
 * Adjust alpha without premultiplying RGB channels.
 */
export function alpha(c: Color, opacity: number): RGBColor | null {
  const rgb = colorToRGB(c);
  if (!rgb) return null;
  return {
    ...rgb,
    a: Math.trunc(clamp(opacity, 0, 1) * 255),
  };
}

// ---- Helpers ----

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return { h: h * 360, s, v };
}

function hsvToRgb(h: number, s: number, v: number): RGBColor {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** Parse the upstream Color string form into a concrete TypeScript color. */
export function color(value: string): Color {
  if (value.startsWith('#')) return parseHex(value) ?? NO_COLOR;
  if (!/^[+-]?\d+$/.test(value)) return NO_COLOR;
  const numeric = Math.abs(Number(value));
  if (numeric < 256) return numeric;
  return { r: (numeric >> 16) & 0xff, g: (numeric >> 8) & 0xff, b: numeric & 0xff };
}

/** Construct an indexed ANSI color. */
export function ansiColor(index: number): number {
  return Math.abs(Math.trunc(index));
}

export type ColorProfile = 'notty' | 'ascii' | 'ansi' | 'ansi256' | 'truecolor';

export const ColorProfiles = {
  notty: 'notty',
  ascii: 'ascii',
  ansi: 'ansi',
  ansi256: 'ansi256',
  truecolor: 'truecolor',
} as const satisfies Record<string, ColorProfile>;

export type CompleteFunc = (ansi: Color, ansi256: Color, truecolor: Color) => Color;

/** Select a caller-provided color appropriate for an output profile. */
export function complete(profile: ColorProfile): CompleteFunc {
  return (ansi, ansi256, truecolor) => {
    if (profile === 'ansi') return ansi;
    if (profile === 'ansi256') return ansi256;
    if (profile === 'truecolor') return truecolor;
    return NO_COLOR;
  };
}

interface LabColor {
  l: number;
  a: number;
  b: number;
}

function rgbToLab(rgb: RGBColor): LabColor {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const r = linear(rgb.r);
  const g = linear(rgb.g);
  const b = linear(rgb.b);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const pivot = (value: number) => value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  const fx = pivot(x);
  const fy = pivot(y);
  const fz = pivot(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function labToRgb(lab: LabColor): RGBColor {
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;
  const pivot = (value: number) => {
    const cube = value ** 3;
    return cube > 0.008856 ? cube : (value - 16 / 116) / 7.787;
  };
  const x = 0.95047 * pivot(fx);
  const y = pivot(fy);
  const z = 1.08883 * pivot(fz);
  const linear = [
    x * 3.2406 + y * -1.5372 + z * -0.4986,
    x * -0.9689 + y * 1.8758 + z * 0.0415,
    x * 0.0557 + y * -0.204 + z * 1.057,
  ];
  const encode = (value: number) => {
    const channel = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
    return Math.round(clamp(channel, 0, 1) * 255);
  };
  return { r: encode(linear[0]), g: encode(linear[1]), b: encode(linear[2]), a: 255 };
}

function blendLab(from: Color, to: Color, factor: number): RGBColor {
  const fromLab = rgbToLab(colorToRGB(from)!);
  const toLab = rgbToLab(colorToRGB(to)!);
  return labToRgb({
    l: fromLab.l + (toLab.l - fromLab.l) * factor,
    a: fromLab.a + (toLab.a - fromLab.a) * factor,
    b: fromLab.b + (toLab.b - fromLab.b) * factor,
  });
}

/** Create a multi-stop CIELAB gradient with upstream segment distribution. */
export function blend1D(steps: number, ...inputStops: Color[]): Color[] {
  steps = Math.max(0, Math.trunc(steps));
  if (steps <= inputStops.length) return inputStops.slice(0, steps);
  const stops = inputStops.filter(stop => parseColor(stop) !== null);
  if (stops.length === 0) return [];
  if (stops.length === 1) return Array<Color>(steps).fill(stops[0]);

  const result = new Array<Color>(steps);
  const segments = stops.length - 1;
  const defaultSize = Math.floor(steps / segments);
  const remaining = steps % segments;
  let resultIndex = 0;
  for (let segment = 0; segment < segments; segment++) {
    const segmentSize = defaultSize + (segment < remaining ? 1 : 0);
    for (let index = 0; index < segmentSize; index++) {
      result[resultIndex++] = blendLab(
        stops[segment],
        stops[segment + 1],
        segmentSize > 1 ? index / (segmentSize - 1) : 0,
      );
    }
  }
  return result;
}

/** Create a rotated, row-major two-dimensional CIELAB gradient. */
export function blend2D(
  requestedWidth: number,
  requestedHeight: number,
  angle: number,
  ...inputStops: Color[]
): Color[] {
  const width = Math.max(1, Math.trunc(requestedWidth));
  const height = Math.max(1, Math.trunc(requestedHeight));
  const stops = inputStops.filter(stop => parseColor(stop) !== null);
  if (stops.length === 0) return [];
  if (stops.length === 1) return Array<Color>(width * height).fill(stops[0]);

  const gradient = blend1D(Math.max(width, height), ...stops);
  const result = new Array<Color>(width * height);
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const normalizedAngle = ((angle % 360) + 360) % 360;
  const radians = normalizedAngle * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const diagonal = Math.sqrt(width * width + height * height);
  const gradientLength = gradient.length - 1;
  for (let y = 0; y < height; y++) {
    const dy = y - centerY;
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const rotatedX = dx * cosine - dy * sine;
      const position = clamp((rotatedX + diagonal / 2) / diagonal, 0, 1);
      result[y * width + x] = gradient[Math.min(gradient.length - 1, Math.trunc(position * gradientLength))];
    }
  }
  return result;
}
