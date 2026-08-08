/**
 * lipgloss — CSS-like terminal styling for JavaScript.
 * Zero dependencies, multi-runtime (Node.js, Bun, Deno).
 *
 * Ported from charmbracelet/lipgloss (Go) by Antonio Oliveira.
 */

// Style
export {
  Style, newStyle, getLines, getFirstRune,
  Top, Bottom, Center, Left, Right,
  NBSP, NoTabConversion,
  UnderlineNone, UnderlineSingle, UnderlineDouble,
  UnderlineCurly, UnderlineDotted, UnderlineDashed,
} from './style.js';
export type { Position } from './style.js';

// Colors
export {
  NO_COLOR, Black, Red, Green, Yellow, Blue, Magenta, Cyan, White,
  BrightBlack, BrightRed, BrightGreen, BrightYellow, BrightBlue,
  BrightMagenta, BrightCyan, BrightWhite,
  color, ansiColor, parseColor, parseHex, colorToRGB, ansi256ToRGB,
  isDarkColor, lightDark, complete, ColorProfiles,
  complementary, darken, lighten, alpha, blend1D, blend2D,
} from './color.js';
export type {
  Color, RGBColor, NoColor, ColorProfile, CompleteFunc,
} from './color.js';

// Borders
export {
  noBorder, normalBorder, roundedBorder, blockBorder,
  outerHalfBlockBorder, innerHalfBlockBorder, thickBorder,
  doubleBorder, hiddenBorder, markdownBorder, asciiBorder,
  maxRuneWidth, getTopSize, getRightSize, getBottomSize, getLeftSize, isNoBorder,
} from './border.js';
export type { Border } from './border.js';

// Layout
export {
  joinHorizontal, joinVertical,
  place, placeHorizontal, placeVertical,
  withWhitespaceChars, withWhitespaceStyle,
} from './layout.js';
export type { WhitespaceOption } from './layout.js';

// ANSI utilities
export {
  SGR, stringWidth, stripAnsi, truncate, styled,
  ansiTokens, graphemes, graphemeWidth, sliceAnsi,
  fgColor, fgAnsi256, fgBasic, bgColor, bgAnsi256, bgBasic,
  ulColor, ulAnsi256, setHyperlink, resetHyperlink,
} from './ansi.js';
export type {
  AnsiToken, ColorValue, UnderlineStyle, AnsiStyleOptions,
} from './ansi.js';

// Measurement and wrapping
export { width, height, size } from './size.js';
export type { Size } from './size.js';
export { wrap, WrapWriter, newWrapWriter } from './wrap.js';
export type { LinkState } from './wrap.js';

// Range styling
export { newRange, styleRanges, styleRunes } from './ranges.js';
export type { Range } from './ranges.js';

// Canvas and layers
export {
  Canvas, newCanvas, Layer, newLayer, LayerHit, Compositor, newCompositor,
} from './layer.js';
export type {
  Rectangle, Cell, Screen, Drawable,
} from './layer.js';

// Output color profiles and writers
export {
  Renderer, ColorProfileWriter, detectColorProfile, renderColorProfile,
  writer, Writer,
  print, println, printf, fprint, fprintln, fprintf, sprint, sprintln, sprintf,
} from './renderer.js';
export type {
  OutputStream, RendererOptions,
} from './renderer.js';
