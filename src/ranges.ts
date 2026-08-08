import { sliceAnsi, stripAnsi } from './ansi.js';
import { Style } from './style.js';

export interface Range {
  start: number;
  end: number;
  style: Style;
}

export function newRange(start: number, end: number, style: Style): Range {
  return { start, end, style };
}

/** Apply non-overlapping styles to visible cell ranges without losing ANSI state. */
export function styleRanges(input: string, ...ranges: Range[]): string {
  if (ranges.length === 0) return input;
  const plain = stripAnsi(input);
  let result = '';
  let last = 0;
  for (const range of ranges) {
    if (range.start > last) result += sliceAnsi(input, last, range.start);
    result += range.style.render(sliceAnsi(plain, range.start, range.end));
    last = range.end;
  }
  result += sliceAnsi(input, last);
  return result;
}

/** Apply styles to Unicode code-point indices, grouping adjacent matches. */
export function styleRunes(
  input: string,
  indices: readonly number[],
  matched: Style,
  unmatched: Style,
): string {
  const selected = new Set(indices);
  const runes = Array.from(input);
  let output = '';
  let group = '';
  for (let index = 0; index < runes.length; index++) {
    group += runes[index];
    const matches = selected.has(index);
    const nextMatches = selected.has(index + 1);
    if (matches !== nextMatches || index === runes.length - 1) {
      output += (matches ? matched : unmatched).render(group);
      group = '';
    }
  }
  return output;
}
