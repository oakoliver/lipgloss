import { stringWidth } from './ansi.js';

/** Maximum terminal-cell width across all lines. */
export function width(str: string): number {
  let result = 0;
  for (const line of str.split('\n')) result = Math.max(result, stringWidth(line));
  return result;
}

/** Number of terminal rows occupied by a string, including an empty last row. */
export function height(str: string): number {
  let result = 1;
  for (let i = 0; i < str.length; i++) if (str.charCodeAt(i) === 10) result++;
  return result;
}

export interface Size {
  width: number;
  height: number;
}

/** Terminal-cell dimensions of a string. */
export function size(str: string): Size {
  return { width: width(str), height: height(str) };
}
