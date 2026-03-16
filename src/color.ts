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
    // Try parsing as number
    const n = parseInt(c, 10);
    if (!isNaN(n)) {
      return parseColor(n);
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
  { r: 0, g: 0, b: 0 },       // Black
  { r: 170, g: 0, b: 0 },     // Red
  { r: 0, g: 170, b: 0 },     // Green
  { r: 170, g: 85, b: 0 },    // Yellow
  { r: 0, g: 0, b: 170 },     // Blue
  { r: 170, g: 0, b: 170 },   // Magenta
  { r: 0, g: 170, b: 170 },   // Cyan
  { r: 170, g: 170, b: 170 }, // White
  { r: 85, g: 85, b: 85 },    // Bright Black
  { r: 255, g: 85, b: 85 },   // Bright Red
  { r: 85, g: 255, b: 85 },   // Bright Green
  { r: 255, g: 255, b: 85 },  // Bright Yellow
  { r: 85, g: 85, b: 255 },   // Bright Blue
  { r: 255, g: 85, b: 255 },  // Bright Magenta
  { r: 85, g: 255, b: 255 },  // Bright Cyan
  { r: 255, g: 255, b: 255 }, // Bright White
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
    r: Math.round(rgb.r * mult),
    g: Math.round(rgb.g * mult),
    b: Math.round(rgb.b * mult),
  };
}

/**
 * Lighten a color by a percentage (0-1).
 */
export function lighten(c: Color, percent: number): Color {
  const rgb = colorToRGB(c);
  if (!rgb) return null;
  const add = 255 * clamp(percent, 0, 1);
  return {
    r: Math.min(255, Math.round(rgb.r + add)),
    g: Math.min(255, Math.round(rgb.g + add)),
    b: Math.min(255, Math.round(rgb.b + add)),
  };
}

/**
 * Adjust alpha (0 = transparent, 1 = opaque). Returns an RGBColor
 * (terminal colors don't truly support alpha, but useful for blending).
 */
export function alpha(c: Color, a: number): RGBColor | null {
  const rgb = colorToRGB(c);
  if (!rgb) return null;
  const al = clamp(a, 0, 1);
  return {
    r: Math.round(rgb.r * al),
    g: Math.round(rgb.g * al),
    b: Math.round(rgb.b * al),
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
