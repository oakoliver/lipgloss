/**
 * Border definitions and built-in border styles.
 */

import { stringWidth } from './ansi.js';

/** Border character set */
export interface Border {
  top: string;
  bottom: string;
  left: string;
  right: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  middleLeft: string;
  middleRight: string;
  middle: string;
  middleTop: string;
  middleBottom: string;
}

function border(b: Partial<Border>): Border {
  return {
    top: '', bottom: '', left: '', right: '',
    topLeft: '', topRight: '', bottomLeft: '', bottomRight: '',
    middleLeft: '', middleRight: '', middle: '', middleTop: '', middleBottom: '',
    ...b,
  };
}

/** No border */
export const noBorder: Border = border({});

/** Standard border with 90-degree corners */
export function normalBorder(): Border {
  return border({
    top: '─', bottom: '─', left: '│', right: '│',
    topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
    middleLeft: '├', middleRight: '┤', middle: '┼', middleTop: '┬', middleBottom: '┴',
  });
}

/** Rounded corners */
export function roundedBorder(): Border {
  return border({
    top: '─', bottom: '─', left: '│', right: '│',
    topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯',
    middleLeft: '├', middleRight: '┤', middle: '┼', middleTop: '┬', middleBottom: '┴',
  });
}

/** Full block border */
export function blockBorder(): Border {
  return border({
    top: '█', bottom: '█', left: '█', right: '█',
    topLeft: '█', topRight: '█', bottomLeft: '█', bottomRight: '█',
    middleLeft: '█', middleRight: '█', middle: '█', middleTop: '█', middleBottom: '█',
  });
}

/** Outer half-block border */
export function outerHalfBlockBorder(): Border {
  return border({
    top: '▀', bottom: '▄', left: '▌', right: '▐',
    topLeft: '▛', topRight: '▜', bottomLeft: '▙', bottomRight: '▟',
  });
}

/** Inner half-block border */
export function innerHalfBlockBorder(): Border {
  return border({
    top: '▄', bottom: '▀', left: '▐', right: '▌',
    topLeft: '▗', topRight: '▖', bottomLeft: '▝', bottomRight: '▘',
  });
}

/** Thick border */
export function thickBorder(): Border {
  return border({
    top: '━', bottom: '━', left: '┃', right: '┃',
    topLeft: '┏', topRight: '┓', bottomLeft: '┗', bottomRight: '┛',
    middleLeft: '┣', middleRight: '┫', middle: '╋', middleTop: '┳', middleBottom: '┻',
  });
}

/** Double-line border */
export function doubleBorder(): Border {
  return border({
    top: '═', bottom: '═', left: '║', right: '║',
    topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝',
    middleLeft: '╠', middleRight: '╣', middle: '╬', middleTop: '╦', middleBottom: '╩',
  });
}

/** Hidden border (spaces) — maintains layout without visible borders */
export function hiddenBorder(): Border {
  return border({
    top: ' ', bottom: ' ', left: ' ', right: ' ',
    topLeft: ' ', topRight: ' ', bottomLeft: ' ', bottomRight: ' ',
    middleLeft: ' ', middleRight: ' ', middle: ' ', middleTop: ' ', middleBottom: ' ',
  });
}

/** Markdown-style table border */
export function markdownBorder(): Border {
  return border({
    top: '-', bottom: '-', left: '|', right: '|',
    topLeft: '|', topRight: '|', bottomLeft: '|', bottomRight: '|',
    middleLeft: '|', middleRight: '|', middle: '|', middleTop: '|', middleBottom: '|',
  });
}

/** ASCII border using +, -, | characters */
export function asciiBorder(): Border {
  return border({
    top: '-', bottom: '-', left: '|', right: '|',
    topLeft: '+', topRight: '+', bottomLeft: '+', bottomRight: '+',
    middleLeft: '+', middleRight: '+', middle: '+', middleTop: '+', middleBottom: '+',
  });
}

/** Get the max rune width of a border edge string */
export function maxRuneWidth(str: string): number {
  if (!str) return 0;
  if (str.length === 1) return stringWidth(str);
  let width = 0;
  for (const ch of str) {
    width = Math.max(width, stringWidth(ch));
  }
  return width;
}

/** Get the width of a border edge (top, bottom, etc.) */
function getBorderEdgeWidth(...parts: string[]): number {
  let max = 0;
  for (const part of parts) {
    max = Math.max(max, maxRuneWidth(part));
  }
  return max;
}

/** Get the size of the top edge of the border */
export function getTopSize(b: Border): number {
  return getBorderEdgeWidth(b.topLeft, b.top, b.topRight);
}

/** Get the size of the right edge of the border */
export function getRightSize(b: Border): number {
  return getBorderEdgeWidth(b.topRight, b.right, b.bottomRight);
}

/** Get the size of the bottom edge of the border */
export function getBottomSize(b: Border): number {
  return getBorderEdgeWidth(b.bottomLeft, b.bottom, b.bottomRight);
}

/** Get the size of the left edge of the border */
export function getLeftSize(b: Border): number {
  return getBorderEdgeWidth(b.topLeft, b.left, b.bottomLeft);
}

/** Check if a border is the "no border" (all empty strings) */
export function isNoBorder(b: Border): boolean {
  return !b.top && !b.bottom && !b.left && !b.right &&
    !b.topLeft && !b.topRight && !b.bottomLeft && !b.bottomRight;
}
