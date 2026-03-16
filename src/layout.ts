/**
 * Layout utilities: JoinHorizontal, JoinVertical, Place, PlaceHorizontal, PlaceVertical.
 * Ported from charmbracelet/lipgloss join.go and position.go.
 */

import { stringWidth } from './ansi.js';
import { getLines } from './style.js';
import type { Position } from './style.js';
import { Top, Bottom, Left, Right } from './style.js';

// ---------------------------------------------------------------------------
// JoinHorizontal
// ---------------------------------------------------------------------------

/**
 * Horizontally join multi-line strings along a vertical axis.
 * `pos` is the vertical alignment: 0 = top, 0.5 = center, 1 = bottom.
 */
export function joinHorizontal(pos: Position, ...strs: string[]): string {
  if (strs.length === 0) return '';
  if (strs.length === 1) return strs[0];

  const blocks: string[][] = [];
  const maxWidths: number[] = [];
  let maxHeight = 0;

  for (let i = 0; i < strs.length; i++) {
    const { lines, widest } = getLines(strs[i]);
    blocks.push(lines);
    maxWidths.push(widest);
    if (lines.length > maxHeight) maxHeight = lines.length;
  }

  // Equalize heights
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].length >= maxHeight) continue;
    const extra = maxHeight - blocks[i].length;
    const empties = new Array<string>(extra).fill('');

    const p = Math.min(1, Math.max(0, pos));
    if (p <= 0) {
      // Top aligned
      blocks[i] = [...blocks[i], ...empties];
    } else if (p >= 1) {
      // Bottom aligned
      blocks[i] = [...empties, ...blocks[i]];
    } else {
      const split = Math.round(extra * p);
      const top = extra - split;
      const bottom = extra - top;
      blocks[i] = [
        ...new Array<string>(top).fill(''),
        ...blocks[i],
        ...new Array<string>(bottom).fill(''),
      ];
    }
  }

  // Merge
  const result: string[] = [];
  for (let row = 0; row < maxHeight; row++) {
    let line = '';
    for (let col = 0; col < blocks.length; col++) {
      const cell = blocks[col][row] || '';
      line += cell;
      // Pad to max width
      const pad = maxWidths[col] - stringWidth(cell);
      if (pad > 0) line += ' '.repeat(pad);
    }
    result.push(line);
  }

  return result.join('\n');
}

// ---------------------------------------------------------------------------
// JoinVertical
// ---------------------------------------------------------------------------

/**
 * Vertically join multi-line strings along a horizontal axis.
 * `pos` is the horizontal alignment: 0 = left, 0.5 = center, 1 = right.
 */
export function joinVertical(pos: Position, ...strs: string[]): string {
  if (strs.length === 0) return '';
  if (strs.length === 1) return strs[0];

  const blocks: string[][] = [];
  let maxWidth = 0;

  for (const str of strs) {
    const { lines, widest } = getLines(str);
    blocks.push(lines);
    if (widest > maxWidth) maxWidth = widest;
  }

  const result: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = 0; j < blocks[i].length; j++) {
      const line = blocks[i][j];
      const gap = maxWidth - stringWidth(line);

      if (gap <= 0) {
        result.push(line);
      } else {
        const p = Math.min(1, Math.max(0, pos));
        if (p <= 0) {
          // Left
          result.push(line + ' '.repeat(gap));
        } else if (p >= 1) {
          // Right
          result.push(' '.repeat(gap) + line);
        } else {
          const split = Math.round(gap * p);
          const left = gap - split;
          const right = gap - left;
          result.push(' '.repeat(left) + line + ' '.repeat(right));
        }
      }
    }
  }

  return result.join('\n');
}

// ---------------------------------------------------------------------------
// Place
// ---------------------------------------------------------------------------

/**
 * Place a string in an unstyled box of given width and height.
 */
export function place(width: number, height: number, hPos: Position, vPos: Position, str: string): string {
  return placeVertical(height, vPos, placeHorizontal(width, hPos, str));
}

/**
 * Place a string horizontally in an unstyled block of given width.
 */
export function placeHorizontal(width: number, pos: Position, str: string): string {
  const { lines, widest: contentWidth } = getLines(str);
  const gap = width - contentWidth;
  if (gap <= 0) return str;

  const result: string[] = [];
  for (const line of lines) {
    const short = Math.max(0, contentWidth - stringWidth(line));
    const totalGap = gap + short;
    const p = Math.min(1, Math.max(0, pos));

    if (p <= 0) {
      // Left
      result.push(line + ' '.repeat(totalGap));
    } else if (p >= 1) {
      // Right
      result.push(' '.repeat(totalGap) + line);
    } else {
      const split = Math.round(totalGap * p);
      const left = totalGap - split;
      const right = totalGap - left;
      result.push(' '.repeat(left) + line + ' '.repeat(right));
    }
  }

  return result.join('\n');
}

/**
 * Place a string vertically in an unstyled block of given height.
 */
export function placeVertical(height: number, pos: Position, str: string): string {
  const contentHeight = str.split('\n').length;
  const gap = height - contentHeight;
  if (gap <= 0) return str;

  const { widest: width } = getLines(str);
  const emptyLine = ' '.repeat(width);
  const p = Math.min(1, Math.max(0, pos));

  if (p <= 0) {
    // Top
    const bottom: string[] = [];
    for (let i = 0; i < gap; i++) bottom.push(emptyLine);
    return str + '\n' + bottom.join('\n');
  } else if (p >= 1) {
    // Bottom
    const top: string[] = [];
    for (let i = 0; i < gap; i++) top.push(emptyLine);
    return top.join('\n') + '\n' + str;
  } else {
    const split = Math.round(gap * p);
    const topCount = gap - split;
    const bottomCount = gap - topCount;

    const topLines: string[] = [];
    for (let i = 0; i < topCount; i++) topLines.push(emptyLine);
    const bottomLines: string[] = [];
    for (let i = 0; i < bottomCount; i++) bottomLines.push(emptyLine);

    let result = '';
    if (topLines.length > 0) result += topLines.join('\n') + '\n';
    result += str;
    if (bottomLines.length > 0) result += '\n' + bottomLines.join('\n');
    return result;
  }
}
