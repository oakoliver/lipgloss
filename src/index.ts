/**
 * lipgloss — CSS-like terminal styling for JavaScript.
 * Zero dependencies, multi-runtime (Node.js, Bun, Deno).
 *
 * Ported from charmbracelet/lipgloss (Go) by Antonio Oliveira.
 */

// Style
export { Style, newStyle, getLines } from './style.js';
export type { Position } from './style.js';
export { Top, Bottom, Center, Left, Right } from './style.js';

// Colors
export {
  NO_COLOR, Black, Red, Green, Yellow, Blue, Magenta, Cyan, White,
  BrightBlack, BrightRed, BrightGreen, BrightYellow, BrightBlue,
  BrightMagenta, BrightCyan, BrightWhite,
  parseColor, parseHex, colorToRGB, ansi256ToRGB,
  isDarkColor, lightDark, complementary, darken, lighten, alpha,
} from './color.js';
export type { Color, RGBColor, NoColor } from './color.js';

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
} from './layout.js';

// ANSI utilities
export {
  SGR, stringWidth, stripAnsi, truncate, styled,
  fgColor, fgAnsi256, fgBasic, bgColor, bgAnsi256, bgBasic,
  ulColor, ulAnsi256, setHyperlink, resetHyperlink,
} from './ansi.js';
export type { ColorValue, UnderlineStyle, AnsiStyleOptions } from './ansi.js';
