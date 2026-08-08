/** ANSI-aware layout and placement helpers. */

import { graphemes, graphemeWidth, stringWidth } from './ansi.js';
import type { Position } from './style.js';
import { Bottom, Left, Right, Top } from './style.js';
import { Style } from './style.js';

interface WhitespaceConfig {
  chars: string;
  style: Style;
}

export type WhitespaceOption = (whitespace: WhitespaceConfig) => void;

export function withWhitespaceStyle(style: Style): WhitespaceOption {
  return whitespace => { whitespace.style = style; };
}

export function withWhitespaceChars(chars: string): WhitespaceOption {
  return whitespace => { whitespace.chars = chars; };
}

function normalizedText(str: string): string {
  return str.replace(/\t/g, '    ').replace(/\r\n/g, '\n');
}

function normalizedLines(str: string): string[] {
  return normalizedText(str).split('\n');
}

function renderWhitespace(cells: number, options: WhitespaceOption[]): string {
  if (cells <= 0) return '';
  const whitespace: WhitespaceConfig = { chars: ' ', style: new Style() };
  for (const option of options) option(whitespace);
  const chars = graphemes(whitespace.chars || ' ').filter(char => graphemeWidth(char) > 0);
  if (chars.length === 0) chars.push(' ');
  let rendered = '';
  let used = 0;
  let index = 0;
  while (used < cells) {
    const char = chars[index++ % chars.length];
    const charWidth = graphemeWidth(char);
    const remaining = cells - used;
    if (charWidth > remaining) {
      rendered += ' '.repeat(remaining);
      break;
    }
    rendered += char;
    used += charWidth;
  }
  return whitespace.style.render(rendered);
}

/** Horizontally join blocks, aligning them along the vertical axis. */
export function joinHorizontal(pos: Position, ...strs: string[]): string {
  if (strs.length === 0) return '';
  if (strs.length === 1) return strs[0];

  const blocks = strs.map(normalizedLines);
  const maxWidths = blocks.map(lines => lines.reduce((max, line) => Math.max(max, stringWidth(line)), 0));
  const maxHeight = blocks.reduce((max, lines) => Math.max(max, lines.length), 0);
  const position = Math.min(1, Math.max(0, pos));

  for (const block of blocks) {
    const missing = maxHeight - block.length;
    if (missing <= 0) continue;
    const empty = Array<string>(missing).fill('');
    if (pos === Top) block.push(...empty);
    else if (pos === Bottom) block.unshift(...empty);
    else {
      const bottom = Math.round(missing * position);
      block.unshift(...empty.slice(missing - bottom));
      block.push(...empty.slice(bottom));
    }
  }

  const rows = new Array<string>(maxHeight);
  for (let row = 0; row < maxHeight; row++) {
    let line = '';
    for (let block = 0; block < blocks.length; block++) {
      const value = blocks[block][row];
      line += value + ' '.repeat(maxWidths[block] - stringWidth(value));
    }
    rows[row] = line;
  }
  return rows.join('\n');
}

/** Vertically join blocks, aligning each line along the horizontal axis. */
export function joinVertical(pos: Position, ...strs: string[]): string {
  if (strs.length === 0) return '';
  if (strs.length === 1) return strs[0];

  const blocks = strs.map(normalizedLines);
  const widest = blocks.reduce(
    (outer, lines) => Math.max(outer, ...lines.map(line => stringWidth(line))),
    0,
  );
  const position = Math.min(1, Math.max(0, pos));
  const rows: string[] = [];
  for (const block of blocks) {
    for (const line of block) {
      const gap = widest - stringWidth(line);
      if (pos === Left) rows.push(line + ' '.repeat(gap));
      else if (pos === Right) rows.push(' '.repeat(gap) + line);
      else {
        const left = Math.round(gap * position);
        rows.push(' '.repeat(left) + line + ' '.repeat(gap - left));
      }
    }
  }
  return rows.join('\n');
}

export function place(
  boxWidth: number,
  boxHeight: number,
  horizontal: Position,
  vertical: Position,
  str: string,
  ...options: WhitespaceOption[]
): string {
  return placeVertical(boxHeight, vertical, placeHorizontal(boxWidth, horizontal, str, ...options), ...options);
}

export function placeHorizontal(
  boxWidth: number,
  pos: Position,
  str: string,
  ...options: WhitespaceOption[]
): string {
  const normalized = normalizedText(str);
  const lines = normalized.split('\n');
  const widest = lines.reduce((max, line) => Math.max(max, stringWidth(line)), 0);
  const gap = boxWidth - widest;
  if (gap <= 0) return normalized;
  const position = Math.min(1, Math.max(0, pos));

  return lines.map(line => {
    const totalGap = gap + Math.max(0, widest - stringWidth(line));
    if (pos === Left) return line + renderWhitespace(totalGap, options);
    if (pos === Right) return renderWhitespace(totalGap, options) + line;
    const left = totalGap - Math.round(totalGap * position);
    return renderWhitespace(left, options) + line + renderWhitespace(totalGap - left, options);
  }).join('\n');
}

export function placeVertical(
  boxHeight: number,
  pos: Position,
  str: string,
  ...options: WhitespaceOption[]
): string {
  const normalized = normalizedText(str);
  const lines = normalized.split('\n');
  const contentHeight = lines.length;
  const gap = boxHeight - contentHeight;
  if (gap <= 0) return normalized;
  const normalizedWidth = lines.reduce((max, line) => Math.max(max, stringWidth(line)), 0);
  const emptyLine = renderWhitespace(normalizedWidth, options);
  if (pos === Top) return normalized + '\n' + Array<string>(gap).fill(emptyLine).join('\n');
  if (pos === Bottom) return (emptyLine + '\n').repeat(gap) + normalized;

  const bottom = Math.round(gap * Math.min(1, Math.max(0, pos)));
  const top = gap - bottom;
  return (emptyLine + '\n').repeat(top) + normalized + ('\n' + emptyLine).repeat(bottom);
}
