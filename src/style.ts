/**
 * Style — the core of lipgloss. Immutable fluent builder for terminal styling.
 * Every setter returns a new Style instance (value-type semantics).
 */

import {
  graphemes, stringWidth, truncate as truncateStr, setHyperlink, resetHyperlink, styled,
} from './ansi.js';
import type { ColorValue, UnderlineStyle, AnsiStyleOptions } from './ansi.js';
import { blend1D, parseColor } from './color.js';
import type { Color } from './color.js';
import { noBorder, isNoBorder, maxRuneWidth, getTopSize, getRightSize, getBottomSize, getLeftSize } from './border.js';
import type { Border } from './border.js';
import { wrap } from './wrap.js';

// ---------------------------------------------------------------------------
// Position type
// ---------------------------------------------------------------------------

/** 0.0 = top/left, 0.5 = center, 1.0 = bottom/right */
export type Position = number;

export const Top: Position = 0.0;
export const Bottom: Position = 1.0;
export const Center: Position = 0.5;
export const Left: Position = 0.0;
export const Right: Position = 1.0;

export const NBSP = '\u00a0';
export const NoTabConversion = -1;
export const UnderlineNone: UnderlineStyle = 'none';
export const UnderlineSingle: UnderlineStyle = 'single';
export const UnderlineDouble: UnderlineStyle = 'double';
export const UnderlineCurly: UnderlineStyle = 'curly';
export const UnderlineDotted: UnderlineStyle = 'dotted';
export const UnderlineDashed: UnderlineStyle = 'dashed';

function clampPos(p: Position): number {
  return Math.min(1, Math.max(0, p));
}

// ---------------------------------------------------------------------------
// CSS-shorthand helpers (1-4 args)
// ---------------------------------------------------------------------------

type Sides<T> = { top: T; right: T; bottom: T; left: T };

function whichSidesInt(...args: number[]): Sides<number> | null {
  switch (args.length) {
    case 1: return { top: args[0], right: args[0], bottom: args[0], left: args[0] };
    case 2: return { top: args[0], right: args[1], bottom: args[0], left: args[1] };
    case 3: return { top: args[0], right: args[1], bottom: args[2], left: args[1] };
    case 4: return { top: args[0], right: args[1], bottom: args[2], left: args[3] };
    default: return null;
  }
}

function whichSidesBool(...args: boolean[]): Sides<boolean> | null {
  switch (args.length) {
    case 1: return { top: args[0], right: args[0], bottom: args[0], left: args[0] };
    case 2: return { top: args[0], right: args[1], bottom: args[0], left: args[1] };
    case 3: return { top: args[0], right: args[1], bottom: args[2], left: args[1] };
    case 4: return { top: args[0], right: args[1], bottom: args[2], left: args[3] };
    default: return null;
  }
}

function whichSidesColor(...args: Color[]): Sides<Color> | null {
  switch (args.length) {
    case 1: return { top: args[0], right: args[0], bottom: args[0], left: args[0] };
    case 2: return { top: args[0], right: args[1], bottom: args[0], left: args[1] };
    case 3: return { top: args[0], right: args[1], bottom: args[2], left: args[1] };
    case 4: return { top: args[0], right: args[1], bottom: args[2], left: args[3] };
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Internal text helpers
// ---------------------------------------------------------------------------

/** Split string into lines and find the widest line's visible width. */
export function getLines(s: string): { lines: string[]; widest: number } {
  s = s.replace(/\t/g, '    ').replace(/\r\n/g, '\n');
  const lines = s.split('\n');
  let widest = 0;
  for (const line of lines) widest = Math.max(widest, stringWidth(line));
  return { lines, widest };
}

/** Horizontal alignment also equalizes every line to the widest line. */
function alignTextHorizontal(
  str: string,
  pos: Position,
  width: number,
  wsStyle: AnsiStyleOptions | null,
): string {
  const { lines, widest } = getLines(str);
  return lines.map(line => {
    const lineWidth = stringWidth(line);
    const shortAmount = widest - lineWidth + Math.max(0, width - widest);
    if (shortAmount <= 0) return line;
    const leftPad = Math.floor(shortAmount * clampPos(pos));
    return styledSpaces(leftPad, wsStyle) + line +
      styledSpaces(shortAmount - leftPad, wsStyle);
  }).join('\n');
}

/** Vertical alignment within a fixed height. */
function alignTextVertical(str: string, pos: Position, height: number): string {
  const strHeight = str.split('\n').length;
  if (height < strHeight) return str;
  const gap = height - strHeight;
  const topPad = Math.floor(gap * clampPos(pos));
  return '\n'.repeat(topPad) + str + '\n'.repeat(gap - topPad);
}

/** Create styled spaces (optionally styled with background/reverse). */
function styledSpaces(n: number, wsStyle: AnsiStyleOptions | null, ch = ' '): string {
  if (n <= 0) return '';
  const sp = ch.repeat(n);
  if (wsStyle) return styled(sp, wsStyle);
  return sp;
}

/** Pad each line on the left. */
function padLeft(str: string, n: number, wsStyle: AnsiStyleOptions | null, ch = ' '): string {
  if (n <= 0) return str;
  const sp = styledSpaces(n, wsStyle, ch);
  return str.split('\n').map(line => sp + line).join('\n');
}

/** Pad each line on the right. */
function padRight(str: string, n: number, wsStyle: AnsiStyleOptions | null, ch = ' '): string {
  if (n <= 0) return str;
  const sp = styledSpaces(n, wsStyle, ch);
  return str.split('\n').map(line => line + sp).join('\n');
}


/** Render a horizontal border edge (top or bottom row). */
function renderHorizontalEdge(left: string, middle: string, right: string, width: number): string {
  if (!middle) middle = ' ';
  const leftW = stringWidth(left);
  const rightW = stringWidth(right);
  const runes = graphemes(middle).filter(rune => stringWidth(rune) > 0);
  if (runes.length === 0) runes.push(' ');
  let j = 0;
  let result = left;
  let i = 0;
  const target = width - leftW - rightW;
  while (i < target) {
    const r = runes[j % runes.length];
    const runeWidth = stringWidth(r);
    const remaining = target - i;
    if (runeWidth > remaining) {
      result += ' '.repeat(remaining);
      break;
    }
    result += r;
    i += runeWidth;
    j++;
  }
  result += right;
  return result;
}

/** Get first character of a string as a string (for corners). */
export function getFirstRune(s: string): string {
  if (!s) return s;
  return [...s][0];
}

// ---------------------------------------------------------------------------
// Style class
// ---------------------------------------------------------------------------

const TAB_WIDTH_DEFAULT = 4;

export class Style {
  // Track which properties have been explicitly set
  private _set = new Set<string>();

  // Internal string value (for SetString / toString)
  private _value = '';

  // Boolean attrs
  private _bold = false;
  private _italic = false;
  private _strikethrough = false;
  private _reverse = false;
  private _blink = false;
  private _faint = false;
  private _underlineSpaces = false;
  private _strikethroughSpaces = false;
  private _colorWhitespace = false;

  // Underline
  private _underlineStyle: UnderlineStyle = 'none';

  // Colors
  private _fg: Color = null;
  private _bg: Color = null;
  private _ulColor: Color = null;

  // Dimensions
  private _width = 0;
  private _height = 0;
  private _maxWidth = 0;
  private _maxHeight = 0;

  // Alignment
  private _alignH: Position = 0;
  private _alignV: Position = 0;

  // Padding
  private _paddingTop = 0;
  private _paddingRight = 0;
  private _paddingBottom = 0;
  private _paddingLeft = 0;

  // Margin
  private _marginTop = 0;
  private _marginRight = 0;
  private _marginBottom = 0;
  private _marginLeft = 0;
  private _marginBg: Color = null;
  private _marginChar = ' ';

  // Border
  private _borderStyle: Border = noBorder;
  private _borderTop = false;
  private _borderRight = false;
  private _borderBottom = false;
  private _borderLeft = false;
  private _borderTopFg: Color = null;
  private _borderRightFg: Color = null;
  private _borderBottomFg: Color = null;
  private _borderLeftFg: Color = null;
  private _borderBlendFg: Color[] = [];
  private _borderBlendOffset = 0;
  private _borderTopBg: Color = null;
  private _borderRightBg: Color = null;
  private _borderBottomBg: Color = null;
  private _borderLeftBg: Color = null;

  // Other
  private _inline = false;
  private _tabWidth = TAB_WIDTH_DEFAULT;
  private _transform: ((s: string) => string) | null = null;
  private _link = '';
  private _linkParams = '';
  private _paddingChar = ' ';

  /** Clone this style into a new instance. */
  private _clone(): Style {
    const s = new Style();
    s._set = new Set(this._set);
    s._value = this._value;
    s._bold = this._bold;
    s._italic = this._italic;
    s._strikethrough = this._strikethrough;
    s._reverse = this._reverse;
    s._blink = this._blink;
    s._faint = this._faint;
    s._underlineSpaces = this._underlineSpaces;
    s._strikethroughSpaces = this._strikethroughSpaces;
    s._colorWhitespace = this._colorWhitespace;
    s._underlineStyle = this._underlineStyle;
    s._fg = this._fg;
    s._bg = this._bg;
    s._ulColor = this._ulColor;
    s._width = this._width;
    s._height = this._height;
    s._maxWidth = this._maxWidth;
    s._maxHeight = this._maxHeight;
    s._alignH = this._alignH;
    s._alignV = this._alignV;
    s._paddingTop = this._paddingTop;
    s._paddingRight = this._paddingRight;
    s._paddingBottom = this._paddingBottom;
    s._paddingLeft = this._paddingLeft;
    s._marginTop = this._marginTop;
    s._marginRight = this._marginRight;
    s._marginBottom = this._marginBottom;
    s._marginLeft = this._marginLeft;
    s._marginBg = this._marginBg;
    s._marginChar = this._marginChar;
    s._borderStyle = this._borderStyle;
    s._borderTop = this._borderTop;
    s._borderRight = this._borderRight;
    s._borderBottom = this._borderBottom;
    s._borderLeft = this._borderLeft;
    s._borderTopFg = this._borderTopFg;
    s._borderRightFg = this._borderRightFg;
    s._borderBottomFg = this._borderBottomFg;
    s._borderLeftFg = this._borderLeftFg;
    s._borderBlendFg = this._borderBlendFg.slice();
    s._borderBlendOffset = this._borderBlendOffset;
    s._borderTopBg = this._borderTopBg;
    s._borderRightBg = this._borderRightBg;
    s._borderBottomBg = this._borderBottomBg;
    s._borderLeftBg = this._borderLeftBg;
    s._inline = this._inline;
    s._tabWidth = this._tabWidth;
    s._transform = this._transform;
    s._link = this._link;
    s._linkParams = this._linkParams;
    s._paddingChar = this._paddingChar;
    return s;
  }

  // -----------------------------------------------------------------------
  // Setters (all return new Style)
  // -----------------------------------------------------------------------

  setString(...strs: string[]): Style {
    const s = this._clone();
    s._value = strs.join(' ');
    return s;
  }
  value(): string {
    return this._value;
  }

  bold(v: boolean): Style {
    const s = this._clone(); s._bold = v; s._set.add('bold'); return s;
  }
  italic(v: boolean): Style {
    const s = this._clone(); s._italic = v; s._set.add('italic'); return s;
  }
  strikethrough(v: boolean): Style {
    const s = this._clone(); s._strikethrough = v; s._set.add('strikethrough'); return s;
  }
  reverse(v: boolean): Style {
    const s = this._clone(); s._reverse = v; s._set.add('reverse'); return s;
  }
  blink(v: boolean): Style {
    const s = this._clone(); s._blink = v; s._set.add('blink'); return s;
  }
  faint(v: boolean): Style {
    const s = this._clone(); s._faint = v; s._set.add('faint'); return s;
  }

  underline(v: boolean): Style {
    return v ? this.underlineStyle('single') : this.underlineStyle('none');
  }
  underlineStyle(u: UnderlineStyle): Style {
    const s = this._clone(); s._underlineStyle = u; s._set.add('underline'); return s;
  }

  foreground(c: Color): Style {
    const s = this._clone(); s._fg = c; s._set.add('fg'); return s;
  }
  background(c: Color): Style {
    const s = this._clone(); s._bg = c; s._set.add('bg'); return s;
  }
  underlineColor(c: Color): Style {
    const s = this._clone(); s._ulColor = c; s._set.add('ulColor'); return s;
  }

  width(n: number): Style {
    const s = this._clone(); s._width = Math.max(0, n); s._set.add('width'); return s;
  }
  height(n: number): Style {
    const s = this._clone(); s._height = Math.max(0, n); s._set.add('height'); return s;
  }
  maxWidth(n: number): Style {
    const s = this._clone(); s._maxWidth = Math.max(0, n); s._set.add('maxWidth'); return s;
  }
  maxHeight(n: number): Style {
    const s = this._clone(); s._maxHeight = Math.max(0, n); s._set.add('maxHeight'); return s;
  }

  align(...pos: Position[]): Style {
    let s = this._clone();
    if (pos.length > 0) { s._alignH = pos[0]; s._set.add('alignH'); }
    if (pos.length > 1) { s._alignV = pos[1]; s._set.add('alignV'); }
    return s;
  }
  alignHorizontal(p: Position): Style {
    const s = this._clone(); s._alignH = p; s._set.add('alignH'); return s;
  }
  alignVertical(p: Position): Style {
    const s = this._clone(); s._alignV = p; s._set.add('alignV'); return s;
  }

  padding(...args: number[]): Style {
    const sides = whichSidesInt(...args);
    if (!sides) return this;
    const s = this._clone();
    s._paddingTop = Math.max(0, sides.top); s._set.add('paddingTop');
    s._paddingRight = Math.max(0, sides.right); s._set.add('paddingRight');
    s._paddingBottom = Math.max(0, sides.bottom); s._set.add('paddingBottom');
    s._paddingLeft = Math.max(0, sides.left); s._set.add('paddingLeft');
    return s;
  }
  paddingTop(n: number): Style {
    const s = this._clone(); s._paddingTop = Math.max(0, n); s._set.add('paddingTop'); return s;
  }
  paddingRight(n: number): Style {
    const s = this._clone(); s._paddingRight = Math.max(0, n); s._set.add('paddingRight'); return s;
  }
  paddingBottom(n: number): Style {
    const s = this._clone(); s._paddingBottom = Math.max(0, n); s._set.add('paddingBottom'); return s;
  }
  paddingLeft(n: number): Style {
    const s = this._clone(); s._paddingLeft = Math.max(0, n); s._set.add('paddingLeft'); return s;
  }

  margin(...args: number[]): Style {
    const sides = whichSidesInt(...args);
    if (!sides) return this;
    const s = this._clone();
    s._marginTop = Math.max(0, sides.top); s._set.add('marginTop');
    s._marginRight = Math.max(0, sides.right); s._set.add('marginRight');
    s._marginBottom = Math.max(0, sides.bottom); s._set.add('marginBottom');
    s._marginLeft = Math.max(0, sides.left); s._set.add('marginLeft');
    return s;
  }
  marginTop(n: number): Style {
    const s = this._clone(); s._marginTop = Math.max(0, n); s._set.add('marginTop'); return s;
  }
  marginRight(n: number): Style {
    const s = this._clone(); s._marginRight = Math.max(0, n); s._set.add('marginRight'); return s;
  }
  marginBottom(n: number): Style {
    const s = this._clone(); s._marginBottom = Math.max(0, n); s._set.add('marginBottom'); return s;
  }
  marginLeft(n: number): Style {
    const s = this._clone(); s._marginLeft = Math.max(0, n); s._set.add('marginLeft'); return s;
  }
  marginBackground(c: Color): Style {
    const s = this._clone(); s._marginBg = c; s._set.add('marginBg'); return s;
  }
  marginChar(ch: string): Style {
    const s = this._clone(); s._marginChar = graphemes(ch)[0] ?? ' '; s._set.add('marginChar'); return s;
  }

  border(b: Border, ...sides: boolean[]): Style {
    const s = this._clone();
    s._borderStyle = b; s._set.add('borderStyle');
    const bs = whichSidesBool(...sides);
    if (bs) {
      s._borderTop = bs.top; s._set.add('borderTop');
      s._borderRight = bs.right; s._set.add('borderRight');
      s._borderBottom = bs.bottom; s._set.add('borderBottom');
      s._borderLeft = bs.left; s._set.add('borderLeft');
    } else {
      s._borderTop = true; s._set.add('borderTop');
      s._borderRight = true; s._set.add('borderRight');
      s._borderBottom = true; s._set.add('borderBottom');
      s._borderLeft = true; s._set.add('borderLeft');
    }
    return s;
  }
  borderStyle(b: Border): Style {
    const s = this._clone(); s._borderStyle = b; s._set.add('borderStyle'); return s;
  }
  borderTop(v: boolean): Style {
    const s = this._clone(); s._borderTop = v; s._set.add('borderTop'); return s;
  }
  borderRight(v: boolean): Style {
    const s = this._clone(); s._borderRight = v; s._set.add('borderRight'); return s;
  }
  borderBottom(v: boolean): Style {
    const s = this._clone(); s._borderBottom = v; s._set.add('borderBottom'); return s;
  }
  borderLeft(v: boolean): Style {
    const s = this._clone(); s._borderLeft = v; s._set.add('borderLeft'); return s;
  }

  borderForeground(...colors: Color[]): Style {
    if (colors.length === 0) return this;
    const sides = whichSidesColor(...colors);
    if (!sides) return this;
    const s = this._clone();
    s._borderTopFg = sides.top; s._set.add('borderTopFg');
    s._borderRightFg = sides.right; s._set.add('borderRightFg');
    s._borderBottomFg = sides.bottom; s._set.add('borderBottomFg');
    s._borderLeftFg = sides.left; s._set.add('borderLeftFg');
    return s;
  }
  borderTopForeground(c: Color): Style {
    const s = this._clone(); s._borderTopFg = c; s._set.add('borderTopFg'); return s;
  }
  borderRightForeground(c: Color): Style {
    const s = this._clone(); s._borderRightFg = c; s._set.add('borderRightFg'); return s;
  }
  borderBottomForeground(c: Color): Style {
    const s = this._clone(); s._borderBottomFg = c; s._set.add('borderBottomFg'); return s;
  }
  borderLeftForeground(c: Color): Style {
    const s = this._clone(); s._borderLeftFg = c; s._set.add('borderLeftFg'); return s;
  }
  borderForegroundBlend(...colors: Color[]): Style {
    if (colors.length === 0) return this;
    if (colors.length === 1) return this.borderForeground(colors[0]);
    const s = this._clone();
    s._borderBlendFg = colors.slice();
    s._set.add('borderBlendFg');
    return s;
  }
  borderForegroundBlendOffset(offset: number): Style {
    const s = this._clone();
    s._borderBlendOffset = Math.trunc(offset);
    s._set.add('borderBlendOffset');
    return s;
  }

  borderBackground(...colors: Color[]): Style {
    if (colors.length === 0) return this;
    const sides = whichSidesColor(...colors);
    if (!sides) return this;
    const s = this._clone();
    s._borderTopBg = sides.top; s._set.add('borderTopBg');
    s._borderRightBg = sides.right; s._set.add('borderRightBg');
    s._borderBottomBg = sides.bottom; s._set.add('borderBottomBg');
    s._borderLeftBg = sides.left; s._set.add('borderLeftBg');
    return s;
  }
  borderTopBackground(c: Color): Style {
    const s = this._clone(); s._borderTopBg = c; s._set.add('borderTopBg'); return s;
  }
  borderRightBackground(c: Color): Style {
    const s = this._clone(); s._borderRightBg = c; s._set.add('borderRightBg'); return s;
  }
  borderBottomBackground(c: Color): Style {
    const s = this._clone(); s._borderBottomBg = c; s._set.add('borderBottomBg'); return s;
  }
  borderLeftBackground(c: Color): Style {
    const s = this._clone(); s._borderLeftBg = c; s._set.add('borderLeftBg'); return s;
  }

  inline(v: boolean): Style {
    const s = this._clone(); s._inline = v; s._set.add('inline'); return s;
  }
  tabWidth(n: number): Style {
    const s = this._clone(); s._tabWidth = n <= -1 ? -1 : n; s._set.add('tabWidth'); return s;
  }
  transform(fn: (s: string) => string): Style {
    const s = this._clone(); s._transform = fn; s._set.add('transform'); return s;
  }
  hyperlink(url: string, ...params: string[]): Style {
    const s = this._clone();
    s._link = url; s._set.add('link');
    if (params.length > 0) { s._linkParams = params.join(':'); s._set.add('linkParams'); }
    return s;
  }
  underlineSpaces(v: boolean): Style {
    const s = this._clone(); s._underlineSpaces = v; s._set.add('underlineSpaces'); return s;
  }
  strikethroughSpaces(v: boolean): Style {
    const s = this._clone(); s._strikethroughSpaces = v; s._set.add('strikethroughSpaces'); return s;
  }
  colorWhitespace(v: boolean): Style {
    const s = this._clone(); s._colorWhitespace = v; s._set.add('colorWhitespace'); return s;
  }
  paddingChar(ch: string): Style {
    const s = this._clone(); s._paddingChar = ch || ' '; s._set.add('paddingChar'); return s;
  }

  // -----------------------------------------------------------------------
  // Copy — returns a full copy preserving ALL properties
  // -----------------------------------------------------------------------

  copy(): Style {
    return this._clone();
  }

  // -----------------------------------------------------------------------
  // Unset methods — remove a property from the set so it reverts to default
  // -----------------------------------------------------------------------

  unsetString(): Style { const s = this._clone(); s._value = ''; return s; }
  unsetBold(): Style { const s = this._clone(); s._set.delete('bold'); s._bold = false; return s; }
  unsetItalic(): Style { const s = this._clone(); s._set.delete('italic'); s._italic = false; return s; }
  unsetUnderline(): Style { const s = this._clone(); s._set.delete('underline'); s._underlineStyle = 'none'; return s; }
  unsetUnderlineSpaces(): Style { const s = this._clone(); s._set.delete('underlineSpaces'); s._underlineSpaces = false; return s; }
  unsetStrikethrough(): Style { const s = this._clone(); s._set.delete('strikethrough'); s._strikethrough = false; return s; }
  unsetStrikethroughSpaces(): Style { const s = this._clone(); s._set.delete('strikethroughSpaces'); s._strikethroughSpaces = false; return s; }
  unsetReverse(): Style { const s = this._clone(); s._set.delete('reverse'); s._reverse = false; return s; }
  unsetBlink(): Style { const s = this._clone(); s._set.delete('blink'); s._blink = false; return s; }
  unsetFaint(): Style { const s = this._clone(); s._set.delete('faint'); s._faint = false; return s; }
  unsetInline(): Style { const s = this._clone(); s._set.delete('inline'); s._inline = false; return s; }
  unsetForeground(): Style { const s = this._clone(); s._set.delete('fg'); s._fg = null; return s; }
  unsetBackground(): Style { const s = this._clone(); s._set.delete('bg'); s._bg = null; return s; }
  unsetUnderlineColor(): Style { const s = this._clone(); s._set.delete('ulColor'); s._ulColor = null; return s; }
  unsetWidth(): Style { const s = this._clone(); s._set.delete('width'); s._width = 0; return s; }
  unsetHeight(): Style { const s = this._clone(); s._set.delete('height'); s._height = 0; return s; }
  unsetMaxWidth(): Style { const s = this._clone(); s._set.delete('maxWidth'); s._maxWidth = 0; return s; }
  unsetMaxHeight(): Style { const s = this._clone(); s._set.delete('maxHeight'); s._maxHeight = 0; return s; }
  unsetAlign(): Style { return this.unsetAlignHorizontal().unsetAlignVertical(); }
  unsetAlignHorizontal(): Style { const s = this._clone(); s._set.delete('alignH'); s._alignH = Left; return s; }
  unsetAlignVertical(): Style { const s = this._clone(); s._set.delete('alignV'); s._alignV = Top; return s; }
  unsetPaddingTop(): Style { const s = this._clone(); s._set.delete('paddingTop'); s._paddingTop = 0; return s; }
  unsetPaddingRight(): Style { const s = this._clone(); s._set.delete('paddingRight'); s._paddingRight = 0; return s; }
  unsetPaddingBottom(): Style { const s = this._clone(); s._set.delete('paddingBottom'); s._paddingBottom = 0; return s; }
  unsetPaddingLeft(): Style { const s = this._clone(); s._set.delete('paddingLeft'); s._paddingLeft = 0; return s; }
  unsetPaddingChar(): Style { const s = this._clone(); s._set.delete('paddingChar'); s._paddingChar = ' '; return s; }
  unsetPadding(): Style {
    return this.unsetPaddingTop().unsetPaddingRight().unsetPaddingBottom().unsetPaddingLeft();
  }
  unsetMarginTop(): Style { const s = this._clone(); s._set.delete('marginTop'); s._marginTop = 0; return s; }
  unsetMarginRight(): Style { const s = this._clone(); s._set.delete('marginRight'); s._marginRight = 0; return s; }
  unsetMarginBottom(): Style { const s = this._clone(); s._set.delete('marginBottom'); s._marginBottom = 0; return s; }
  unsetMarginLeft(): Style { const s = this._clone(); s._set.delete('marginLeft'); s._marginLeft = 0; return s; }
  unsetMargins(): Style {
    return this.unsetMarginTop().unsetMarginRight().unsetMarginBottom().unsetMarginLeft();
  }
  unsetMarginBackground(): Style { const s = this._clone(); s._set.delete('marginBg'); s._marginBg = null; return s; }
  unsetBorderTop(): Style { const s = this._clone(); s._set.delete('borderTop'); s._borderTop = false; return s; }
  unsetBorderRight(): Style { const s = this._clone(); s._set.delete('borderRight'); s._borderRight = false; return s; }
  unsetBorderBottom(): Style { const s = this._clone(); s._set.delete('borderBottom'); s._borderBottom = false; return s; }
  unsetBorderLeft(): Style { const s = this._clone(); s._set.delete('borderLeft'); s._borderLeft = false; return s; }
  unsetBorderStyle(): Style { const s = this._clone(); s._set.delete('borderStyle'); s._borderStyle = noBorder; return s; }
  unsetBorderForeground(): Style {
    return this.unsetBorderTopForeground().unsetBorderRightForeground()
      .unsetBorderBottomForeground().unsetBorderLeftForeground();
  }
  unsetBorderTopForeground(): Style { const s = this._clone(); s._set.delete('borderTopFg'); s._borderTopFg = null; return s; }
  unsetBorderRightForeground(): Style { const s = this._clone(); s._set.delete('borderRightFg'); s._borderRightFg = null; return s; }
  unsetBorderBottomForeground(): Style { const s = this._clone(); s._set.delete('borderBottomFg'); s._borderBottomFg = null; return s; }
  unsetBorderLeftForeground(): Style { const s = this._clone(); s._set.delete('borderLeftFg'); s._borderLeftFg = null; return s; }
  unsetBorderForegroundBlend(): Style { const s = this._clone(); s._set.delete('borderBlendFg'); s._borderBlendFg = []; return s; }
  unsetBorderForegroundBlendOffset(): Style { const s = this._clone(); s._set.delete('borderBlendOffset'); s._borderBlendOffset = 0; return s; }
  unsetBorderBackground(): Style {
    return this.unsetBorderTopBackground().unsetBorderRightBackground()
      .unsetBorderBottomBackground().unsetBorderLeftBackground();
  }
  unsetBorderTopBackground(): Style { const s = this._clone(); s._set.delete('borderTopBg'); s._borderTopBg = null; return s; }
  unsetBorderTopBackgroundColor(): Style { return this.unsetBorderTopBackground(); }
  unsetBorderRightBackground(): Style { const s = this._clone(); s._set.delete('borderRightBg'); s._borderRightBg = null; return s; }
  unsetBorderBottomBackground(): Style { const s = this._clone(); s._set.delete('borderBottomBg'); s._borderBottomBg = null; return s; }
  unsetBorderLeftBackground(): Style { const s = this._clone(); s._set.delete('borderLeftBg'); s._borderLeftBg = null; return s; }
  unsetTabWidth(): Style { const s = this._clone(); s._set.delete('tabWidth'); s._tabWidth = TAB_WIDTH_DEFAULT; return s; }
  unsetTransform(): Style { const s = this._clone(); s._set.delete('transform'); s._transform = null; return s; }
  unsetHyperlink(): Style { const s = this._clone(); s._set.delete('link'); s._link = ''; s._set.delete('linkParams'); s._linkParams = ''; return s; }
  unsetColorWhitespace(): Style { const s = this._clone(); s._set.delete('colorWhitespace'); s._colorWhitespace = false; return s; }

  // -----------------------------------------------------------------------
  // Getters
  // -----------------------------------------------------------------------

  getBold(): boolean { return this._set.has('bold') ? this._bold : false; }
  getItalic(): boolean { return this._set.has('italic') ? this._italic : false; }
  getUnderline(): boolean { return this._underlineStyle !== 'none'; }
  getUnderlineStyle(): UnderlineStyle { return this._underlineStyle; }
  getStrikethrough(): boolean { return this._set.has('strikethrough') ? this._strikethrough : false; }
  getReverse(): boolean { return this._set.has('reverse') ? this._reverse : false; }
  getBlink(): boolean { return this._set.has('blink') ? this._blink : false; }
  getFaint(): boolean { return this._set.has('faint') ? this._faint : false; }
  getForeground(): Color { return this._set.has('fg') ? this._fg : null; }
  getBackground(): Color { return this._set.has('bg') ? this._bg : null; }
  getUnderlineColor(): Color { return this._set.has('ulColor') ? this._ulColor : null; }
  getWidth(): number { return this._set.has('width') ? this._width : 0; }
  getHeight(): number { return this._set.has('height') ? this._height : 0; }
  getMaxWidth(): number { return this._set.has('maxWidth') ? this._maxWidth : 0; }
  getMaxHeight(): number { return this._set.has('maxHeight') ? this._maxHeight : 0; }
  getAlign(): Position { return this.getAlignHorizontal(); }
  getAlignHorizontal(): Position { return this._set.has('alignH') ? this._alignH : Left; }
  getAlignVertical(): Position { return this._set.has('alignV') ? this._alignV : Top; }
  getInline(): boolean { return this._set.has('inline') ? this._inline : false; }
  getTabWidth(): number { return this._set.has('tabWidth') ? this._tabWidth : TAB_WIDTH_DEFAULT; }
  getUnderlineSpaces(): boolean { return this._set.has('underlineSpaces') ? this._underlineSpaces : false; }
  getStrikethroughSpaces(): boolean { return this._set.has('strikethroughSpaces') ? this._strikethroughSpaces : false; }
  getColorWhitespace(): boolean { return this._set.has('colorWhitespace') ? this._colorWhitespace : false; }
  getTransform(): ((s: string) => string) | null { return this._set.has('transform') ? this._transform : null; }
  getPaddingChar(): string { return this._set.has('paddingChar') ? this._paddingChar : ' '; }
  getHyperlink(): { link: string; params: string } {
    return { link: this._set.has('link') ? this._link : '', params: this._set.has('linkParams') ? this._linkParams : '' };
  }

  getPadding(): { top: number; right: number; bottom: number; left: number } {
    return {
      top: this._set.has('paddingTop') ? this._paddingTop : 0,
      right: this._set.has('paddingRight') ? this._paddingRight : 0,
      bottom: this._set.has('paddingBottom') ? this._paddingBottom : 0,
      left: this._set.has('paddingLeft') ? this._paddingLeft : 0,
    };
  }
  getPaddingTop(): number { return this._set.has('paddingTop') ? this._paddingTop : 0; }
  getPaddingRight(): number { return this._set.has('paddingRight') ? this._paddingRight : 0; }
  getPaddingBottom(): number { return this._set.has('paddingBottom') ? this._paddingBottom : 0; }
  getPaddingLeft(): number { return this._set.has('paddingLeft') ? this._paddingLeft : 0; }
  getHorizontalPadding(): number { return this.getPaddingLeft() + this.getPaddingRight(); }
  getVerticalPadding(): number { return this.getPaddingTop() + this.getPaddingBottom(); }

  getMargin(): { top: number; right: number; bottom: number; left: number } {
    return {
      top: this._set.has('marginTop') ? this._marginTop : 0,
      right: this._set.has('marginRight') ? this._marginRight : 0,
      bottom: this._set.has('marginBottom') ? this._marginBottom : 0,
      left: this._set.has('marginLeft') ? this._marginLeft : 0,
    };
  }
  getMarginTop(): number { return this._set.has('marginTop') ? this._marginTop : 0; }
  getMarginRight(): number { return this._set.has('marginRight') ? this._marginRight : 0; }
  getMarginBottom(): number { return this._set.has('marginBottom') ? this._marginBottom : 0; }
  getMarginLeft(): number { return this._set.has('marginLeft') ? this._marginLeft : 0; }
  getHorizontalMargins(): number { return this.getMarginLeft() + this.getMarginRight(); }
  getVerticalMargins(): number { return this.getMarginTop() + this.getMarginBottom(); }
  getMarginChar(): string { return this._set.has('marginChar') ? this._marginChar : ' '; }

  getBorderStyle(): Border { return this._set.has('borderStyle') ? this._borderStyle : noBorder; }
  getBorderTop(): boolean { return this._set.has('borderTop') ? this._borderTop : false; }
  getBorderRight(): boolean { return this._set.has('borderRight') ? this._borderRight : false; }
  getBorderBottom(): boolean { return this._set.has('borderBottom') ? this._borderBottom : false; }
  getBorderLeft(): boolean { return this._set.has('borderLeft') ? this._borderLeft : false; }
  getBorder(): { style: Border; top: boolean; right: boolean; bottom: boolean; left: boolean } {
    return {
      style: this.getBorderStyle(),
      top: this.getBorderTop(),
      right: this.getBorderRight(),
      bottom: this.getBorderBottom(),
      left: this.getBorderLeft(),
    };
  }
  getBorderTopForeground(): Color { return this._set.has('borderTopFg') ? this._borderTopFg : null; }
  getBorderRightForeground(): Color { return this._set.has('borderRightFg') ? this._borderRightFg : null; }
  getBorderBottomForeground(): Color { return this._set.has('borderBottomFg') ? this._borderBottomFg : null; }
  getBorderLeftForeground(): Color { return this._set.has('borderLeftFg') ? this._borderLeftFg : null; }
  getBorderForegroundBlend(): Color[] {
    return this._set.has('borderBlendFg') ? this._borderBlendFg.slice() : [];
  }
  getBorderForegroundBlendOffset(): number {
    return this._set.has('borderBlendOffset') ? this._borderBlendOffset : 0;
  }
  getBorderTopBackground(): Color { return this._set.has('borderTopBg') ? this._borderTopBg : null; }
  getBorderRightBackground(): Color { return this._set.has('borderRightBg') ? this._borderRightBg : null; }
  getBorderBottomBackground(): Color { return this._set.has('borderBottomBg') ? this._borderBottomBg : null; }
  getBorderLeftBackground(): Color { return this._set.has('borderLeftBg') ? this._borderLeftBg : null; }

  /** True when border style is set but no individual side bools are set. */
  private _isBorderStyleSetWithoutSides(): boolean {
    const b = this.getBorderStyle();
    const anySideSet = this._set.has('borderTop') || this._set.has('borderRight') ||
                       this._set.has('borderBottom') || this._set.has('borderLeft');
    return !isNoBorder(b) && !anySideSet;
  }

  getBorderTopSize(): number {
    if (this._isBorderStyleSetWithoutSides()) return 1;
    if (!this.getBorderTop()) return 0;
    return getTopSize(this.getBorderStyle());
  }
  getBorderTopWidth(): number { return this.getBorderTopSize(); }
  getBorderRightSize(): number {
    if (this._isBorderStyleSetWithoutSides()) return 1;
    if (!this.getBorderRight()) return 0;
    return getRightSize(this.getBorderStyle());
  }
  getBorderBottomSize(): number {
    if (this._isBorderStyleSetWithoutSides()) return 1;
    if (!this.getBorderBottom()) return 0;
    return getBottomSize(this.getBorderStyle());
  }
  getBorderLeftSize(): number {
    if (this._isBorderStyleSetWithoutSides()) return 1;
    if (!this.getBorderLeft()) return 0;
    return getLeftSize(this.getBorderStyle());
  }

  getHorizontalBorderSize(): number { return this.getBorderLeftSize() + this.getBorderRightSize(); }
  getVerticalBorderSize(): number { return this.getBorderTopSize() + this.getBorderBottomSize(); }

  getHorizontalFrameSize(): number {
    return this.getHorizontalMargins() + this.getHorizontalPadding() + this.getHorizontalBorderSize();
  }
  getVerticalFrameSize(): number {
    return this.getVerticalMargins() + this.getVerticalPadding() + this.getVerticalBorderSize();
  }
  getFrameSize(): { x: number; y: number } {
    return { x: this.getHorizontalFrameSize(), y: this.getVerticalFrameSize() };
  }

  // -----------------------------------------------------------------------
  // Inherit
  // -----------------------------------------------------------------------

  /** Copy explicitly-set values from `other` that are NOT set on this style. Margins/padding are not inherited. */
  inherit(other: Style): Style {
    const s = this._clone();
    const skip = new Set([
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'link', 'linkParams',
    ]);
    for (const key of other._set) {
      if (skip.has(key)) continue;
      // If background is inherited, also inherit margin bg
      if (key === 'bg' && !s._set.has('marginBg') && !other._set.has('marginBg')) {
        s._marginBg = other._bg;
        s._set.add('marginBg');
      }
      if (s._set.has(key)) continue;
      // Copy value
      (s as any)['_' + this._keyToField(key)] = (other as any)['_' + this._keyToField(key)];
      s._set.add(key);
    }
    return s;
  }

  private _keyToField(key: string): string {
    const map: Record<string, string> = {
      bold: 'bold', italic: 'italic', strikethrough: 'strikethrough',
      reverse: 'reverse', blink: 'blink', faint: 'faint',
      underlineSpaces: 'underlineSpaces', strikethroughSpaces: 'strikethroughSpaces',
      colorWhitespace: 'colorWhitespace', underline: 'underlineStyle',
      fg: 'fg', bg: 'bg', ulColor: 'ulColor',
      width: 'width', height: 'height', maxWidth: 'maxWidth', maxHeight: 'maxHeight',
      alignH: 'alignH', alignV: 'alignV',
      paddingTop: 'paddingTop', paddingRight: 'paddingRight',
      paddingBottom: 'paddingBottom', paddingLeft: 'paddingLeft',
      marginTop: 'marginTop', marginRight: 'marginRight',
      marginBottom: 'marginBottom', marginLeft: 'marginLeft',
      marginBg: 'marginBg', marginChar: 'marginChar',
      borderStyle: 'borderStyle', borderBlendFg: 'borderBlendFg',
      borderBlendOffset: 'borderBlendOffset',
      borderTop: 'borderTop', borderRight: 'borderRight',
      borderBottom: 'borderBottom', borderLeft: 'borderLeft',
      borderTopFg: 'borderTopFg', borderRightFg: 'borderRightFg',
      borderBottomFg: 'borderBottomFg', borderLeftFg: 'borderLeftFg',
      borderTopBg: 'borderTopBg', borderRightBg: 'borderRightBg',
      borderBottomBg: 'borderBottomBg', borderLeftBg: 'borderLeftBg',
      inline: 'inline', tabWidth: 'tabWidth', transform: 'transform',
      link: 'link', linkParams: 'linkParams', paddingChar: 'paddingChar',
    };
    return map[key] || key;
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  /** Render the style applied to the given strings (joined with space). */
  render(...strs: string[]): string {
    if (this._value) strs = [this._value, ...strs];
    let str = strs.join(' ');

    const hasUnderline = this._underlineStyle !== 'none';
    const isBold = this._set.has('bold') && this._bold;
    const isItalic = this._set.has('italic') && this._italic;
    const isStrikethrough = this._set.has('strikethrough') && this._strikethrough;
    const isReverse = this._set.has('reverse') && this._reverse;
    const isBlink = this._set.has('blink') && this._blink;
    const isFaint = this._set.has('faint') && this._faint;
    const fg = this._set.has('fg') ? parseColor(this._fg) : null;
    const bg = this._set.has('bg') ? parseColor(this._bg) : null;
    const ul = this._set.has('ulColor') ? parseColor(this._ulColor) : null;

    const w = this._set.has('width') ? this._width : 0;
    const h = this._set.has('height') ? this._height : 0;
    const hAlign = this._set.has('alignH') ? this._alignH : Left;
    const vAlign = this._set.has('alignV') ? this._alignV : Top;
    const topPad = this._set.has('paddingTop') ? this._paddingTop : 0;
    const rightPad = this._set.has('paddingRight') ? this._paddingRight : 0;
    const bottomPad = this._set.has('paddingBottom') ? this._paddingBottom : 0;
    const leftPad = this._set.has('paddingLeft') ? this._paddingLeft : 0;
    const hBorderSize = this.getHorizontalBorderSize();
    const vBorderSize = this.getVerticalBorderSize();
    const colorWS = this._set.has('colorWhitespace') ? this._colorWhitespace : true;
    const isInline = this._set.has('inline') ? this._inline : false;
    const mw = this._set.has('maxWidth') ? this._maxWidth : 0;
    const mh = this._set.has('maxHeight') ? this._maxHeight : 0;
    const ulSpaces = (this._set.has('underlineSpaces') && this._underlineSpaces) || (hasUnderline && (!this._set.has('underlineSpaces') || this._underlineSpaces));
    const stSpaces = (this._set.has('strikethroughSpaces') && this._strikethroughSpaces) || (isStrikethrough && (!this._set.has('strikethroughSpaces') || this._strikethroughSpaces));
    const styleWhitespace = isReverse;
    const useSpaceStyler = (hasUnderline && !ulSpaces) || (isStrikethrough && !stSpaces) || ulSpaces || stSpaces;
    const transform = this._set.has('transform') ? this._transform : null;
    const link = this._set.has('link') ? this._link : '';
    const linkParams = this._set.has('linkParams') ? this._linkParams : '';

    if (transform) str = transform(str);

    // If no props set at all, just do tab conversion
    if (this._set.size === 0) return this._maybeConvertTabs(str);

    // Build main text style options
    const teOpts: AnsiStyleOptions = {};
    const teSpaceOpts: AnsiStyleOptions = {};
    const teWSOpts: AnsiStyleOptions = {};

    if (isBold) teOpts.bold = true;
    if (isItalic) teOpts.italic = true;
    if (hasUnderline) { teOpts.underline = true; teOpts.underlineStyle = this._underlineStyle; }
    if (isReverse) { teOpts.reverse = true; teWSOpts.reverse = true; }
    if (isBlink) teOpts.blink = true;
    if (isFaint) teOpts.faint = true;
    if (isStrikethrough) teOpts.strikethrough = true;

    if (fg) {
      teOpts.fg = fg;
      if (styleWhitespace) teWSOpts.fg = fg;
      if (useSpaceStyler) teSpaceOpts.fg = fg;
    }
    if (bg) {
      teOpts.bg = bg;
      if (colorWS) teWSOpts.bg = bg;
      if (useSpaceStyler) teSpaceOpts.bg = bg;
    }
    if (ul) {
      teOpts.ul = ul;
      if (colorWS) teWSOpts.ul = ul;
      if (useSpaceStyler) teSpaceOpts.ul = ul;
    }
    if (ulSpaces) teSpaceOpts.underline = true;
    if (stSpaces) teSpaceOpts.strikethrough = true;

    // Tab conversion
    str = this._maybeConvertTabs(str);
    str = str.replace(/\r\n/g, '\n');

    // Strip newlines in inline mode
    if (isInline) str = str.replace(/\n/g, '');

    // Include borders in block size
    let width = w - hBorderSize;
    let height = h - vBorderSize;

    // Word wrap
    if (!isInline && width > 0) {
      const wrapAt = width - leftPad - rightPad;
      str = wrap(str, wrapAt);
    }

    // Render core text — apply ANSI styles line by line
    {
      const lines = str.split('\n');
      const rendered: string[] = [];
      for (const line of lines) {
        if (useSpaceStyler) {
          let buf = '';
          for (const ch of graphemes(line)) {
            if (/\s/u.test(ch)) {
              buf += styled(ch, teSpaceOpts);
            } else {
              buf += styled(ch, teOpts);
            }
          }
          rendered.push(buf);
        } else {
          rendered.push(line ? styled(line, teOpts) : line);
        }
      }
      str = rendered.join('\n');

      if (link) {
        str = setHyperlink(link, linkParams || undefined) + str + resetHyperlink();
      }
    }

    // Padding
    if (!isInline) {
      const wsStyle = (colorWS || styleWhitespace) ? teWSOpts : null;
      const padCh = this._set.has('paddingChar') ? this._paddingChar : ' ';
      if (leftPad > 0) str = padLeft(str, leftPad, wsStyle, padCh);
      if (rightPad > 0) str = padRight(str, rightPad, wsStyle, padCh);
      if (topPad > 0) str = '\n'.repeat(topPad) + str;
      if (bottomPad > 0) str = str + '\n'.repeat(bottomPad);
    }

    // Height
    if (height > 0) str = alignTextVertical(str, vAlign, height);

    // Horizontal alignment (also equalizes line widths)
    {
      const numLines = str.split('\n').length - 1;
      if (numLines > 0 || width > 0) {
        const wsStyle = (colorWS || styleWhitespace) ? teWSOpts : null;
        str = alignTextHorizontal(str, hAlign, width, wsStyle);
      }
    }

    // Borders and margins
    if (!isInline) {
      str = this._applyBorder(str);
      str = this._applyMargins(str, isInline);
    }

    // MaxWidth truncation
    if (mw > 0) {
      str = str.split('\n').map(line => truncateStr(line, mw)).join('\n');
    }

    // MaxHeight truncation
    if (mh > 0) {
      const lines = str.split('\n');
      if (lines.length > mh) str = lines.slice(0, mh).join('\n');
    }

    return str;
  }

  // -----------------------------------------------------------------------
  // Internal: tab conversion
  // -----------------------------------------------------------------------

  private _maybeConvertTabs(str: string): string {
    const tw = this._set.has('tabWidth') ? this._tabWidth : TAB_WIDTH_DEFAULT;
    if (tw === -1) return str;
    if (tw === 0) return str.replace(/\t/g, '');
    return str.replace(/\t/g, ' '.repeat(tw));
  }

  // -----------------------------------------------------------------------
  // Internal: border rendering
  // -----------------------------------------------------------------------

  private _applyBorder(str: string): string {
    let borderDef = this.getBorderStyle();
    let hasT = this.getBorderTop();
    let hasR = this.getBorderRight();
    let hasB = this.getBorderBottom();
    let hasL = this.getBorderLeft();

    // Default: if border style set but no sides specified, show all sides
    if (this._isBorderStyleSetWithoutSides()) {
      hasT = true; hasR = true; hasB = true; hasL = true;
    }

    if (isNoBorder(borderDef) || (!hasT && !hasR && !hasB && !hasL)) return str;

    // Clone border to mutate corners
    borderDef = { ...borderDef };

    const { lines, widest } = getLines(str);
    let width = widest;

    if (hasL) {
      if (!borderDef.left) borderDef.left = ' ';
      width += maxRuneWidth(borderDef.left);
    }
    if (hasR) {
      if (!borderDef.right) borderDef.right = ' ';
      width += maxRuneWidth(borderDef.right);
    }

    // Fill empty corners with space if both adjacent sides exist
    if (hasT && hasL && !borderDef.topLeft) borderDef.topLeft = ' ';
    if (hasT && hasR && !borderDef.topRight) borderDef.topRight = ' ';
    if (hasB && hasL && !borderDef.bottomLeft) borderDef.bottomLeft = ' ';
    if (hasB && hasR && !borderDef.bottomRight) borderDef.bottomRight = ' ';

    // Clear corners when adjacent side is off
    if (hasT) {
      if (!hasL && !hasR) { borderDef.topLeft = ''; borderDef.topRight = ''; }
      else if (!hasL) { borderDef.topLeft = ''; }
      else if (!hasR) { borderDef.topRight = ''; }
    }
    if (hasB) {
      if (!hasL && !hasR) { borderDef.bottomLeft = ''; borderDef.bottomRight = ''; }
      else if (!hasL) { borderDef.bottomLeft = ''; }
      else if (!hasR) { borderDef.bottomRight = ''; }
    }

    // Limit corners to one rune
    borderDef.topLeft = getFirstRune(borderDef.topLeft);
    borderDef.topRight = getFirstRune(borderDef.topRight);
    borderDef.bottomLeft = getFirstRune(borderDef.bottomLeft);
    borderDef.bottomRight = getFirstRune(borderDef.bottomRight);

    const topFg = this._set.has('borderTopFg') ? parseColor(this._borderTopFg) : null;
    const rightFg = this._set.has('borderRightFg') ? parseColor(this._borderRightFg) : null;
    const bottomFg = this._set.has('borderBottomFg') ? parseColor(this._borderBottomFg) : null;
    const leftFg = this._set.has('borderLeftFg') ? parseColor(this._borderLeftFg) : null;
    const topBg = this._set.has('borderTopBg') ? parseColor(this._borderTopBg) : null;
    const rightBg = this._set.has('borderRightBg') ? parseColor(this._borderRightBg) : null;
    const bottomBg = this._set.has('borderBottomBg') ? parseColor(this._borderBottomBg) : null;
    const leftBg = this._set.has('borderLeftBg') ? parseColor(this._borderLeftBg) : null;
    let blend: { top: Color[]; right: Color[]; bottom: Color[]; left: Color[] } | null = null;
    if (this._set.has('borderBlendFg') && this._borderBlendFg.length > 1) {
      const gradient = blend1D((lines.length + width + 2) * 2, ...this._borderBlendFg);
      const shift = ((this._borderBlendOffset % gradient.length) + gradient.length) % gradient.length;
      if (shift) gradient.unshift(...gradient.splice(gradient.length - shift));
      let offset = 0;
      const take = (count: number) => {
        const values = gradient.slice(offset, offset + count);
        offset += count;
        return values;
      };
      blend = {
        top: take(width + 2),
        right: take(lines.length),
        bottom: take(width + 2).reverse(),
        left: take(lines.length).reverse(),
      };
    }

    let out = '';

    // Top edge
    if (hasT) {
      const top = renderHorizontalEdge(borderDef.topLeft, borderDef.top, borderDef.topRight, width);
      out += (blend ? styleBorderBlend(top, blend.top, topBg) : styleBorderStr(top, topFg, topBg)) + '\n';
    }

    // Side edges
    const leftRunes = [...borderDef.left];
    const rightRunes = [...borderDef.right];
    let li = 0, ri = 0;

    for (let i = 0; i < lines.length; i++) {
      if (hasL) {
        const r = leftRunes[li % leftRunes.length];
        li++;
        out += blend
          ? styleBorderStr(r, parseColor(blend.left[i]) ?? null, leftBg)
          : styleBorderStr(r, leftFg, leftBg);
      }
      out += lines[i];
      if (hasR) {
        const r = rightRunes[ri % rightRunes.length];
        ri++;
        out += blend
          ? styleBorderStr(r, parseColor(blend.right[i]) ?? null, rightBg)
          : styleBorderStr(r, rightFg, rightBg);
      }
      if (i < lines.length - 1) out += '\n';
    }

    // Bottom edge
    if (hasB) {
      const bottom = renderHorizontalEdge(borderDef.bottomLeft, borderDef.bottom, borderDef.bottomRight, width);
      out += '\n' + (blend
        ? styleBorderBlend(bottom, blend.bottom, bottomBg)
        : styleBorderStr(bottom, bottomFg, bottomBg));
    }

    return out;
  }

  // -----------------------------------------------------------------------
  // Internal: margin rendering
  // -----------------------------------------------------------------------

  private _applyMargins(str: string, isInline: boolean): string {
    const topM = this._set.has('marginTop') ? this._marginTop : 0;
    const rightM = this._set.has('marginRight') ? this._marginRight : 0;
    const bottomM = this._set.has('marginBottom') ? this._marginBottom : 0;
    const leftM = this._set.has('marginLeft') ? this._marginLeft : 0;

    const marginBg = this._set.has('marginBg') ? parseColor(this._marginBg) : null;
    const marginStyle: AnsiStyleOptions | null = marginBg ? { bg: marginBg } : null;

    const marginChar = this._set.has('marginChar') ? this._marginChar : ' ';
    if (leftM > 0) str = padLeft(str, leftM, marginStyle, marginChar);
    if (rightM > 0) str = padRight(str, rightM, marginStyle, marginChar);

    if (!isInline) {
      const { widest: totalWidth } = getLines(str);
      const blankLine = marginStyle ? styled(' '.repeat(totalWidth), marginStyle) : ' '.repeat(totalWidth);

      if (topM > 0) {
        str = (blankLine + '\n').repeat(topM) + str;
      }
      if (bottomM > 0) {
        str = str + ('\n' + blankLine).repeat(bottomM);
      }
    }

    return str;
  }

  // -----------------------------------------------------------------------
  // toString
  // -----------------------------------------------------------------------

  toString(): string {
    return this.render();
  }
}

// ---------------------------------------------------------------------------
// Module-level helper: style a border string with fg/bg colors
// ---------------------------------------------------------------------------

function styleBorderStr(border: string, fg: ColorValue | null, bg: ColorValue | null): string {
  if (!fg && !bg) return border;
  return styled(border, { fg, bg });
}

function styleBorderBlend(border: string, foreground: Color[], bg: ColorValue | null): string {
  let result = '';
  let index = 0;
  for (const cluster of graphemes(border)) {
    result += styled(cluster, { fg: parseColor(foreground[index++]) ?? null, bg });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Create a new empty Style. */
export function newStyle(): Style {
  return new Style();
}
