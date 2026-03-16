import { describe, expect, it } from 'bun:test';
import {
  NO_COLOR, Black, Red, Green, Yellow, Blue, Magenta, Cyan, White,
  BrightBlack, BrightRed, BrightWhite,
  parseColor, parseHex, colorToRGB, ansi256ToRGB,
  isDarkColor, lightDark, complementary, darken, lighten, alpha,
} from '../src/color.js';
import type { RGBColor } from '../src/color.js';

describe('color constants', () => {
  it('should have correct basic color values', () => {
    expect(Black).toBe(0);
    expect(Red).toBe(1);
    expect(Green).toBe(2);
    expect(Yellow).toBe(3);
    expect(Blue).toBe(4);
    expect(Magenta).toBe(5);
    expect(Cyan).toBe(6);
    expect(White).toBe(7);
  });
  it('should have correct bright color values', () => {
    expect(BrightBlack).toBe(8);
    expect(BrightRed).toBe(9);
    expect(BrightWhite).toBe(15);
  });
});

describe('parseColor', () => {
  it('should return null for null/undefined/NO_COLOR', () => {
    expect(parseColor(null)).toBeNull();
    expect(parseColor(undefined)).toBeNull();
    expect(parseColor(NO_COLOR)).toBeNull();
  });
  it('should parse basic ANSI (0-15) as basic type', () => {
    const result = parseColor(0);
    expect(result).toEqual({ type: 'basic', value: 0 });
  });
  it('should parse 256 color (16-255) as ansi256', () => {
    const result = parseColor(196);
    expect(result).toEqual({ type: 'ansi256', value: 196 });
  });
  it('should parse hex string #RRGGBB as rgb', () => {
    const result = parseColor('#ff0000');
    expect(result).toEqual({ type: 'rgb', value: 0, r: 255, g: 0, b: 0 });
  });
  it('should parse short hex #RGB', () => {
    const result = parseColor('#f00');
    expect(result).toEqual({ type: 'rgb', value: 0, r: 255, g: 0, b: 0 });
  });
  it('should parse numeric string as number', () => {
    const result = parseColor('196');
    expect(result).toEqual({ type: 'ansi256', value: 196 });
  });
  it('should parse RGBColor object', () => {
    const result = parseColor({ r: 100, g: 200, b: 50 });
    expect(result).toEqual({ type: 'rgb', value: 0, r: 100, g: 200, b: 50 });
  });
  it('should return null for invalid string', () => {
    expect(parseColor('not-a-color')).toBeNull();
  });
  it('should handle packed RGB numbers > 255', () => {
    const result = parseColor(0xff8040);
    expect(result).toEqual({ type: 'rgb', value: 0, r: 255, g: 128, b: 64 });
  });
});

describe('parseHex', () => {
  it('should parse #RRGGBB', () => {
    expect(parseHex('#aabbcc')).toEqual({ r: 170, g: 187, b: 204 });
  });
  it('should parse #RGB', () => {
    expect(parseHex('#abc')).toEqual({ r: 170, g: 187, b: 204 });
  });
  it('should return null for invalid hex', () => {
    expect(parseHex('abc')).toBeNull();
    expect(parseHex('#ab')).toBeNull();
    expect(parseHex('#abcde')).toBeNull();
  });
  // Go parity: 25 edge cases from TestParseHex
  it('should parse lowercase hex', () => {
    expect(parseHex('#aabbcc')).toEqual({ r: 170, g: 187, b: 204 });
  });
  it('should parse uppercase hex', () => {
    expect(parseHex('#AABBCC')).toEqual({ r: 170, g: 187, b: 204 });
  });
  it('should parse mixed case hex', () => {
    expect(parseHex('#AaBbCc')).toEqual({ r: 170, g: 187, b: 204 });
  });
  it('should return null for missing hash', () => {
    expect(parseHex('aabbcc')).toBeNull();
  });
  it('should return null for empty string', () => {
    expect(parseHex('')).toBeNull();
  });
  it('should return null for only hash', () => {
    expect(parseHex('#')).toBeNull();
  });
  it('should return null for too-short (2 chars)', () => {
    expect(parseHex('#ab')).toBeNull();
  });
  it('should return null for too-long (7 chars)', () => {
    expect(parseHex('#aabbccd')).toBeNull();
  });
  it('should return null for 4 hex chars', () => {
    expect(parseHex('#abcd')).toBeNull();
  });
  it('should return null for 5 hex chars', () => {
    expect(parseHex('#abcde')).toBeNull();
  });
  it('should return null for invalid chars in 6-digit', () => {
    expect(parseHex('#gggggg')).toBeNull();
  });
  it('should return null for invalid chars in 3-digit', () => {
    expect(parseHex('#ggg')).toBeNull();
  });
  it('should parse #000000', () => {
    expect(parseHex('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });
  it('should parse #ffffff', () => {
    expect(parseHex('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('should parse #FFFFFF', () => {
    expect(parseHex('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('should parse #ff0000 (red)', () => {
    expect(parseHex('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });
  it('should parse #00ff00 (green)', () => {
    expect(parseHex('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
  });
  it('should parse #0000ff (blue)', () => {
    expect(parseHex('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
  });
  it('should parse short #f00 (red)', () => {
    expect(parseHex('#f00')).toEqual({ r: 255, g: 0, b: 0 });
  });
  it('should parse short #0f0 (green)', () => {
    expect(parseHex('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
  });
  it('should parse short #00f (blue)', () => {
    expect(parseHex('#00f')).toEqual({ r: 0, g: 0, b: 255 });
  });
});

describe('colorToRGB', () => {
  it('should convert hex to RGB', () => {
    expect(colorToRGB('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
  });
  it('should convert ANSI basic to approximate RGB', () => {
    const result = colorToRGB(Red);
    expect(result).not.toBeNull();
    expect(result!.r).toBeGreaterThan(0);
  });
  it('should return null for NO_COLOR', () => {
    expect(colorToRGB(NO_COLOR)).toBeNull();
  });
});

describe('ansi256ToRGB', () => {
  it('should return correct RGB for basic color 0 (black)', () => {
    expect(ansi256ToRGB(0)).toEqual({ r: 0, g: 0, b: 0 });
  });
  it('should return correct RGB for color 15 (bright white)', () => {
    expect(ansi256ToRGB(15)).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('should handle 6x6x6 color cube (index 16)', () => {
    // Index 16 = r=0, g=0, b=0 in cube = all zeros
    expect(ansi256ToRGB(16)).toEqual({ r: 0, g: 0, b: 0 });
  });
  it('should handle 6x6x6 color cube (index 196)', () => {
    // 196 - 16 = 180, r = floor(180/36) = 5, g = floor((180%36)/6) = 0, b = 0
    const result = ansi256ToRGB(196);
    expect(result.r).toBe(255); // 5 * 40 + 55
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });
  it('should handle grayscale (232-255)', () => {
    // Index 232 = (232-232)*10+8 = 8
    expect(ansi256ToRGB(232)).toEqual({ r: 8, g: 8, b: 8 });
    // Index 255 = (255-232)*10+8 = 238
    expect(ansi256ToRGB(255)).toEqual({ r: 238, g: 238, b: 238 });
  });
});

describe('isDarkColor', () => {
  it('should identify black as dark', () => {
    expect(isDarkColor('#000000')).toBe(true);
  });
  it('should identify white as not dark', () => {
    expect(isDarkColor('#ffffff')).toBe(false);
  });
  it('should identify NO_COLOR as dark (default)', () => {
    expect(isDarkColor(NO_COLOR)).toBe(true);
  });
});

describe('lightDark', () => {
  it('should return dark color when isDark is true', () => {
    const picker = lightDark(true);
    expect(picker('#ffffff', '#000000')).toBe('#000000');
  });
  it('should return light color when isDark is false', () => {
    const picker = lightDark(false);
    expect(picker('#ffffff', '#000000')).toBe('#ffffff');
  });
});

describe('complementary', () => {
  it('should return complementary of red', () => {
    const result = complementary('#ff0000');
    expect(result).not.toBeNull();
    const rgb = result as RGBColor;
    expect(rgb.g).toBeGreaterThan(200);
    expect(rgb.b).toBeGreaterThan(200);
    expect(rgb.r).toBeLessThan(50);
  });
  it('should return null for NO_COLOR', () => {
    expect(complementary(NO_COLOR)).toBeNull();
  });
  // Go parity: more colors
  it('complementary of green', () => {
    const result = complementary('#00ff00') as RGBColor;
    expect(result).not.toBeNull();
    expect(result.r).toBeGreaterThan(200);
    expect(result.g).toBeLessThan(50);
    expect(result.b).toBeGreaterThan(200);
  });
  it('complementary of blue', () => {
    const result = complementary('#0000ff') as RGBColor;
    expect(result).not.toBeNull();
    expect(result.r).toBeGreaterThan(200);
    expect(result.g).toBeGreaterThan(200);
    expect(result.b).toBeLessThan(50);
  });
  it('complementary of yellow', () => {
    const result = complementary('#ffff00') as RGBColor;
    expect(result).not.toBeNull();
    expect(result.b).toBeGreaterThan(200);
  });
  it('complementary of cyan', () => {
    const result = complementary('#00ffff') as RGBColor;
    expect(result).not.toBeNull();
    expect(result.r).toBeGreaterThan(200);
  });
  it('complementary of magenta', () => {
    const result = complementary('#ff00ff') as RGBColor;
    expect(result).not.toBeNull();
    expect(result.g).toBeGreaterThan(200);
  });
  it('complementary of black', () => {
    const result = complementary('#000000') as RGBColor;
    expect(result).not.toBeNull();
    // Black complement is still black (all channels flipped 0->255...but hue rotation doesn't change)
    // Actually complement of black in HSL shifts hue 180 but L stays 0 → still black
    expect(result.r + result.g + result.b).toBeLessThanOrEqual(3);
  });
  it('complementary of white', () => {
    const result = complementary('#ffffff') as RGBColor;
    expect(result).not.toBeNull();
    // White complement: hue shifts 180 but S=0 L=100 → still white
    expect(result.r).toBeGreaterThan(250);
  });
  it('complementary of gray', () => {
    const result = complementary('#808080') as RGBColor;
    expect(result).not.toBeNull();
    // Gray has S=0, complement is still gray
    expect(Math.abs(result.r - 128)).toBeLessThan(5);
  });
  it('complementary of null returns null', () => {
    expect(complementary(null)).toBeNull();
  });
});

describe('darken', () => {
  it('should darken white by 50%', () => {
    const result = darken('#ffffff', 0.5) as RGBColor;
    expect(result.r).toBe(128);
    expect(result.g).toBe(128);
    expect(result.b).toBe(128);
  });
  it('should darken to black at 100%', () => {
    const result = darken('#ffffff', 1.0) as RGBColor;
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });
  // Go parity
  it('should darken red by 25%', () => {
    const result = darken('#ff0000', 0.25) as RGBColor;
    expect(result.r).toBe(191); // 255 * 0.75 ≈ 191
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });
  it('should darken blue by 75%', () => {
    const result = darken('#0000ff', 0.75) as RGBColor;
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(64); // 255 * 0.25 ≈ 64
  });
  it('should darken black by 10% (stays black)', () => {
    const result = darken('#000000', 0.1) as RGBColor;
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });
  it('should clamp at 0% (no change)', () => {
    const result = darken('#ff8040', 0) as RGBColor;
    expect(result.r).toBe(255);
    expect(result.g).toBe(128);
    expect(result.b).toBe(64);
  });
  it('should return null for NO_COLOR', () => {
    expect(darken(NO_COLOR, 0.5)).toBeNull();
  });
});

describe('lighten', () => {
  it('should lighten black by 50%', () => {
    const result = lighten('#000000', 0.5) as RGBColor;
    expect(result.r).toBe(128);
    expect(result.g).toBe(128);
    expect(result.b).toBe(128);
  });
  it('should cap at 255', () => {
    const result = lighten('#ff0000', 1.0) as RGBColor;
    expect(result.r).toBe(255);
    expect(result.g).toBe(255);
    expect(result.b).toBe(255);
  });
  // Go parity
  it('should lighten red by 25%', () => {
    const result = lighten('#ff0000', 0.25) as RGBColor;
    expect(result.r).toBe(255);
    expect(result.g).toBe(64); // 0 + 255*0.25 ≈ 64
    expect(result.b).toBe(64);
  });
  it('should lighten blue by 75%', () => {
    const result = lighten('#0000ff', 0.75) as RGBColor;
    expect(result.r).toBe(191); // 0 + 255*0.75 ≈ 191
    expect(result.g).toBe(191);
    expect(result.b).toBe(255);
  });
  it('should lighten white by 10% (stays white)', () => {
    const result = lighten('#ffffff', 0.1) as RGBColor;
    expect(result.r).toBe(255);
    expect(result.g).toBe(255);
    expect(result.b).toBe(255);
  });
  it('should clamp at 0% (no change)', () => {
    const result = lighten('#ff8040', 0) as RGBColor;
    expect(result.r).toBe(255);
    expect(result.g).toBe(128);
    expect(result.b).toBe(64);
  });
  it('should return null for NO_COLOR', () => {
    expect(lighten(NO_COLOR, 0.5)).toBeNull();
  });
});

describe('alpha', () => {
  it('should apply alpha to color (full opacity)', () => {
    const result = alpha('#ff8040', 1.0);
    expect(result).not.toBeNull();
    expect(result!.r).toBe(255);
    expect(result!.g).toBe(128);
    expect(result!.b).toBe(64);
  });
  it('should apply half opacity', () => {
    const result = alpha('#ff8040', 0.5);
    expect(result).not.toBeNull();
    expect(result!.r).toBe(128);
    expect(result!.g).toBe(64);
    expect(result!.b).toBe(32);
  });
  it('should apply quarter opacity', () => {
    const result = alpha('#ff8040', 0.25);
    expect(result).not.toBeNull();
    expect(result!.r).toBe(64);
    expect(result!.g).toBe(32);
    expect(result!.b).toBe(16);
  });
  it('should handle alpha=0 as fully transparent', () => {
    const result = alpha('#ffffff', 0);
    expect(result).toEqual({ r: 0, g: 0, b: 0 });
  });
  it('should clamp alpha above 1.0', () => {
    const result = alpha('#ff0000', 1.5);
    expect(result).not.toBeNull();
    // Clamped to 1.0
    expect(result!.r).toBe(255);
    expect(result!.g).toBe(0);
    expect(result!.b).toBe(0);
  });
  it('should clamp alpha below 0', () => {
    const result = alpha('#ff0000', -0.5);
    expect(result).not.toBeNull();
    // Clamped to 0
    expect(result!.r).toBe(0);
    expect(result!.g).toBe(0);
    expect(result!.b).toBe(0);
  });
  it('should return null for NO_COLOR', () => {
    expect(alpha(NO_COLOR, 0.5)).toBeNull();
  });
});
