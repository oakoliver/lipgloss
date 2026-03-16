/**
 * ANSI escape code utilities for terminal styling.
 * Pure TypeScript implementation — no dependencies.
 */

// CSI (Control Sequence Introducer)
const ESC = '\x1b';
const CSI = `${ESC}[`;

/** SGR (Select Graphic Rendition) codes */
export const SGR = {
  reset: `${CSI}0m`,

  bold: `${CSI}1m`,
  faint: `${CSI}2m`,
  italic: `${CSI}3m`,
  underline: `${CSI}4m`,
  blink: `${CSI}5m`,
  reverse: `${CSI}7m`,
  strikethrough: `${CSI}9m`,

  // Underline styles (not universally supported)
  underlineNone: `${CSI}24m`,
  underlineSingle: `${CSI}4m`,
  underlineDouble: `${CSI}4:2m`,
  underlineCurly: `${CSI}4:3m`,
  underlineDotted: `${CSI}4:4m`,
  underlineDashed: `${CSI}4:5m`,

  // Reset specific attributes
  resetBold: `${CSI}22m`,
  resetItalic: `${CSI}23m`,
  resetUnderline: `${CSI}24m`,
  resetBlink: `${CSI}25m`,
  resetReverse: `${CSI}27m`,
  resetStrikethrough: `${CSI}29m`,
} as const;

/** Set foreground color using ANSI basic (0-7), bright (8-15), 256, or RGB */
export function fgColor(r: number, g: number, b: number): string {
  return `${CSI}38;2;${r};${g};${b}m`;
}

export function fgAnsi256(n: number): string {
  return `${CSI}38;5;${n}m`;
}

export function fgBasic(n: number): string {
  if (n < 8) return `${CSI}${30 + n}m`;
  return `${CSI}${90 + (n - 8)}m`;
}

/** Set background color using ANSI basic (0-7), bright (8-15), 256, or RGB */
export function bgColor(r: number, g: number, b: number): string {
  return `${CSI}48;2;${r};${g};${b}m`;
}

export function bgAnsi256(n: number): string {
  return `${CSI}48;5;${n}m`;
}

export function bgBasic(n: number): string {
  if (n < 8) return `${CSI}${40 + n}m`;
  return `${CSI}${100 + (n - 8)}m`;
}

/** Set underline color (not universally supported) */
export function ulColor(r: number, g: number, b: number): string {
  return `${CSI}58;2;${r};${g};${b}m`;
}

export function ulAnsi256(n: number): string {
  return `${CSI}58;5;${n}m`;
}

/** OSC hyperlink escape sequences */
export function setHyperlink(url: string, params?: string): string {
  const p = params ? params : '';
  return `${ESC}]8;${p};${url}${ESC}\\`;
}

export function resetHyperlink(): string {
  return `${ESC}]8;;${ESC}\\`;
}

/**
 * Strip all ANSI escape sequences from a string.
 */
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /[\x1b\x9b][[()#;?]*(?:[0-9]{1,4}(?:[;:][0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]|\x1b\]8;[^\x1b]*\x1b\\/g;

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

/**
 * Measure the visible (printable) width of a string, ignoring ANSI codes.
 * This is a simplified implementation that handles common cases.
 * For full Unicode width support, a proper East Asian Width implementation
 * would be needed, but this covers the vast majority of use cases.
 */
export function stringWidth(str: string): number {
  const stripped = stripAnsi(str);
  let width = 0;
  for (let i = 0; i < stripped.length; i++) {
    const code = stripped.charCodeAt(i);
    // Skip combining characters (rough heuristic)
    if (code >= 0x0300 && code <= 0x036f) continue;
    if (code >= 0x1ab0 && code <= 0x1aff) continue;
    if (code >= 0x1dc0 && code <= 0x1dff) continue;
    if (code >= 0x20d0 && code <= 0x20ff) continue;
    if (code >= 0xfe20 && code <= 0xfe2f) continue;

    // Handle surrogate pairs for full Unicode
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = stripped.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        const cp = (code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
        // CJK Unified Ideographs Extension B+
        if (cp >= 0x20000 && cp <= 0x3ffff) {
          width += 2;
        } else {
          width += 1;
        }
        i++; // skip low surrogate
        continue;
      }
    }

    // East Asian Full-width and Wide characters
    if (isFullWidth(code)) {
      width += 2;
    } else if (code === 0x09) {
      // Tab — we handle this at a higher level
      width += 4;
    } else {
      width += 1;
    }
  }
  return width;
}

/** Check if a Unicode code point is full-width */
function isFullWidth(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0x303e) || // CJK Radicals, Kangxi, Ideographic Description
    (code >= 0x3040 && code <= 0x33bf) || // Hiragana, Katakana, Bopomofo, etc.
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Unified Ideographs Extension A
    (code >= 0x4e00 && code <= 0xa4cf) || // CJK Unified Ideographs, Yi
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0xfe30 && code <= 0xfe6f) || // CJK Compatibility Forms, Small Form Variants
    (code >= 0xff01 && code <= 0xff60) || // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6)    // Fullwidth Signs
  );
}

/**
 * Truncate a string to a maximum visible width, stripping ANSI codes as needed.
 */
export function truncate(str: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (stringWidth(str) <= maxWidth) return str;

  let width = 0;
  let result = '';
  let inEscape = false;
  let escapeSeq = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (inEscape) {
      escapeSeq += ch;
      // Check for end of escape sequence
      if (/[A-Za-z~]/.test(ch) || (escapeSeq.startsWith('\x1b]') && ch === '\\' && escapeSeq[escapeSeq.length - 2] === '\x1b')) {
        result += escapeSeq;
        inEscape = false;
        escapeSeq = '';
      }
      continue;
    }

    if (ch === '\x1b' || ch === '\x9b') {
      inEscape = true;
      escapeSeq = ch;
      continue;
    }

    const code = ch.charCodeAt(0);
    const charWidth = isFullWidth(code) ? 2 : 1;

    if (width + charWidth > maxWidth) break;
    width += charWidth;
    result += ch;
  }

  return result;
}

/**
 * Build an ANSI styled string by wrapping content in SGR sequences.
 */
export interface AnsiStyleOptions {
  bold?: boolean;
  faint?: boolean;
  italic?: boolean;
  underline?: boolean;
  underlineStyle?: UnderlineStyle;
  blink?: boolean;
  reverse?: boolean;
  strikethrough?: boolean;
  fg?: ColorValue | null;
  bg?: ColorValue | null;
  ul?: ColorValue | null;
}

export type UnderlineStyle = 'none' | 'single' | 'double' | 'curly' | 'dotted' | 'dashed';

export interface ColorValue {
  type: 'basic' | 'ansi256' | 'rgb';
  value: number; // for basic (0-15) and ansi256 (0-255)
  r?: number;
  g?: number;
  b?: number;
}

/**
 * Apply ANSI styling to a string.
 */
export function styled(str: string, opts: AnsiStyleOptions): string {
  let prefix = '';
  let suffix = '';

  if (opts.bold) { prefix += SGR.bold; }
  if (opts.faint) { prefix += SGR.faint; }
  if (opts.italic) { prefix += SGR.italic; }
  if (opts.underline || (opts.underlineStyle && opts.underlineStyle !== 'none')) {
    const style = opts.underlineStyle || 'single';
    switch (style) {
      case 'single': prefix += SGR.underlineSingle; break;
      case 'double': prefix += SGR.underlineDouble; break;
      case 'curly': prefix += SGR.underlineCurly; break;
      case 'dotted': prefix += SGR.underlineDotted; break;
      case 'dashed': prefix += SGR.underlineDashed; break;
    }
  }
  if (opts.blink) { prefix += SGR.blink; }
  if (opts.reverse) { prefix += SGR.reverse; }
  if (opts.strikethrough) { prefix += SGR.strikethrough; }

  if (opts.fg) {
    prefix += colorToFg(opts.fg);
  }
  if (opts.bg) {
    prefix += colorToBg(opts.bg);
  }
  if (opts.ul) {
    prefix += colorToUl(opts.ul);
  }

  if (prefix) {
    suffix = SGR.reset;
  }

  return prefix + str + suffix;
}

function colorToFg(c: ColorValue): string {
  switch (c.type) {
    case 'basic': return fgBasic(c.value);
    case 'ansi256': return fgAnsi256(c.value);
    case 'rgb': return fgColor(c.r!, c.g!, c.b!);
  }
}

function colorToBg(c: ColorValue): string {
  switch (c.type) {
    case 'basic': return bgBasic(c.value);
    case 'ansi256': return bgAnsi256(c.value);
    case 'rgb': return bgColor(c.r!, c.g!, c.b!);
  }
}

function colorToUl(c: ColorValue): string {
  switch (c.type) {
    case 'basic': return ulAnsi256(c.value); // underline color uses 256 encoding for basic too
    case 'ansi256': return ulAnsi256(c.value);
    case 'rgb': return ulColor(c.r!, c.g!, c.b!);
  }
}
