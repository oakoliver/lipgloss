import { SgrState } from './sgr.js';

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
 * ANSI-aware Unicode helpers. Lip Gloss measures terminal cells rather than
 * UTF-16 code units. Intl.Segmenter is available in every supported runtime
 * and keeps emoji ZWJ sequences, flags, keycaps, and combining marks intact.
 */
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u;
const MARK = /\p{Mark}/u;
const CONTROL = /[\p{Cc}\p{Cf}]/u;

export interface AnsiToken {
  value: string;
  ansi: boolean;
}

/** Split a string into ANSI control sequences and printable text. */
export function ansiTokens(input: string): AnsiToken[] {
  const tokens: AnsiToken[] = [];
  let textStart = 0;
  const pushText = (end: number) => {
    if (end > textStart) tokens.push({ value: input.slice(textStart, end), ansi: false });
  };

  for (let i = 0; i < input.length;) {
    const c = input.charCodeAt(i);
    const c1String = c === 0x90 || c === 0x98 || c === 0x9d || c === 0x9e || c === 0x9f;
    if (c !== 0x1b && c !== 0x9b && c !== 0x9c && !c1String) {
      i++;
      continue;
    }
    pushText(i);
    const start = i;
    if (c === 0x9b || input[i + 1] === '[') {
      i += c === 0x9b ? 1 : 2;
      while (i < input.length) {
        const n = input.charCodeAt(i++);
        if (n >= 0x40 && n <= 0x7e) break;
      }
    } else if (c === 0x9d || input[i + 1] === ']') {
      i += c === 0x9d ? 1 : 2;
      while (i < input.length) {
        if (input.charCodeAt(i) === 0x07 || input.charCodeAt(i) === 0x9c) { i++; break; }
        if (input.charCodeAt(i) === 0x1b && input[i + 1] === '\\') { i += 2; break; }
        i++;
      }
    } else if (c1String || 'PX^_'.includes(input[i + 1] ?? '')) {
      i += c1String ? 1 : 2;
      while (i < input.length) {
        if (input.charCodeAt(i) === 0x9c) { i++; break; }
        if (input.charCodeAt(i) === 0x1b && input[i + 1] === '\\') { i += 2; break; }
        i++;
      }
    } else {
      i = Math.min(input.length, i + (c === 0x1b ? 2 : 1));
    }
    tokens.push({ value: input.slice(start, i), ansi: true });
    textStart = i;
  }
  pushText(input.length);
  return tokens;
}

export function stripAnsi(str: string): string {
  let result = '';
  for (const token of ansiTokens(str)) if (!token.ansi) result += token.value;
  return result;
}

/** Return extended grapheme clusters without splitting emoji or combining text. */
export function graphemes(str: string): string[] {
  return Array.from(segmenter.segment(str), part => part.segment);
}

export type AnsiGraphemeEvent =
  | { kind: 'ansi'; value: string }
  | { kind: 'grapheme'; value: string; width: number; parts: AnsiToken[] };

/**
 * Segment printable text after removing controls, then restore controls at
 * their original code-point boundaries. This keeps ANSI inside ZWJ/combining
 * sequences from splitting one terminal grapheme into several cells.
 */
export function ansiGraphemeEvents(input: string): AnsiGraphemeEvent[] {
  const controls: Array<{ offset: number; value: string }> = [];
  let plain = '';
  for (const token of ansiTokens(input)) {
    if (token.ansi) controls.push({ offset: plain.length, value: token.value });
    else plain += token.value;
  }

  const events: AnsiGraphemeEvent[] = [];
  let controlIndex = 0;
  for (const segment of segmenter.segment(plain)) {
    const start = segment.index;
    const end = start + segment.segment.length;
    while (controlIndex < controls.length && controls[controlIndex].offset === start) {
      events.push({ kind: 'ansi', value: controls[controlIndex++].value });
    }

    const parts: AnsiToken[] = [];
    let textIndex = start;
    while (controlIndex < controls.length && controls[controlIndex].offset < end) {
      const control = controls[controlIndex++];
      if (control.offset > textIndex) {
        parts.push({ value: plain.slice(textIndex, control.offset), ansi: false });
      }
      parts.push({ value: control.value, ansi: true });
      textIndex = control.offset;
    }
    if (textIndex < end) parts.push({ value: plain.slice(textIndex, end), ansi: false });
    events.push({
      kind: 'grapheme',
      value: segment.segment,
      width: graphemeWidth(segment.segment),
      parts,
    });
  }
  while (controlIndex < controls.length) {
    events.push({ kind: 'ansi', value: controls[controlIndex++].value });
  }
  return events;
}

/** Measure one extended grapheme cluster in terminal cells. */
export function graphemeWidth(cluster: string): number {
  if (!cluster || cluster === '\n' || cluster === '\r') return 0;
  if (cluster === '\t') return 4;

  const codepoints = Array.from(cluster);
  const first = codepoints[0].codePointAt(0)!;
  if (first === 0 || first < 0x20 || (first >= 0x7f && first < 0xa0)) return 0;

  // Default emoji-presentation code points and explicit VS16 sequences use
  // two cells. Extended_Pictographic alone is insufficient: many symbols
  // (such as gear, scissors, and text heart) default to one-cell text.
  if (
    EMOJI_PRESENTATION.test(cluster) ||
    /\u20e3/u.test(cluster) ||
    /[\u{1f1e6}-\u{1f1ff}]{2}/u.test(cluster) ||
    /\ufe0f/u.test(cluster)
  ) return 2;

  // A cluster made entirely of combining/default-ignorable characters has no
  // width. Otherwise the base character determines the width.
  if (codepoints.every(ch => MARK.test(ch) || CONTROL.test(ch))) return 0;
  return isFullWidth(first) ? 2 : 1;
}

/** Measure visible terminal-cell width, ignoring ANSI control sequences. */
export function stringWidth(str: string): number {
  let width = 0;
  for (const cluster of graphemes(stripAnsi(str))) width += graphemeWidth(cluster);
  return width;
}

/** Check whether a Unicode code point has East Asian Wide/Fullwidth width. */
function isFullWidth(code: number): boolean {
  return (
    code >= 0x1100 && (
      code <= 0x115f ||
      code === 0x2329 || code === 0x232a ||
      (code >= 0x2e80 && code <= 0x303e) ||
      (code >= 0x3040 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1b000 && code <= 0x1b2ff) ||
      (code >= 0x20000 && code <= 0x3fffd)
    )
  );
}

/**
 * Truncate to a visible width without splitting a grapheme or dropping ANSI
 * sequences already encountered.
 */
export function truncate(str: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (stringWidth(str) <= maxWidth) return str;

  let result = '';
  let width = 0;
  const sgr = new SgrState();
  let linkActive = false;
  const trackControl = (control: string): void => {
    sgr.apply(control);
    const link = /^(?:\x1b\]|\x9d)8;[^;]*;(.*?)(?:\x07|\x1b\\|\x9c)$/.exec(control);
    if (link) linkActive = link[1].length > 0;
  };

  for (const event of ansiGraphemeEvents(str)) {
    if (event.kind === 'ansi') {
      result += event.value;
      trackControl(event.value);
      continue;
    }
    if (width + event.width > maxWidth) break;
    for (const part of event.parts) {
      result += part.value;
      if (part.ansi) trackControl(part.value);
    }
    width += event.width;
  }
  if (sgr.toString()) result += SGR.reset;
  if (linkActive) result += resetHyperlink();
  return result;
}

/**
 * Cut a visible cell range while retaining ANSI state encountered before the
 * range. This mirrors x/ansi Cut's cell-based indexing and is used by ranges.
 */
export function sliceAnsi(str: string, start: number, end = Number.POSITIVE_INFINITY): string {
  start = Math.max(0, start);
  end = Math.max(start, end);
  let position = 0;
  let prefix = '';
  let result = '';
  let started = false;

  for (const event of ansiGraphemeEvents(str)) {
    if (event.kind === 'ansi') {
      if (started) result += event.value;
      else prefix += event.value;
      continue;
    }
    const next = position + event.width;
    if (next <= start) {
      for (const part of event.parts) if (part.ansi) prefix += part.value;
      position = next;
      continue;
    }
    if (position >= end) break;
    if (!started) {
      result = prefix;
      started = true;
    }
    for (const part of event.parts) result += part.value;
    position = next;
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
