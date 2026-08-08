import {
  ansiGraphemeEvents,
  ansiTokens,
  graphemes,
  resetHyperlink,
} from './ansi.js';
import { AnsiStreamDecoder } from './stream.js';
import { SgrState } from './sgr.js';

const utf8Encoder = new TextEncoder();

interface WritableLike {
  write(chunk: string | Uint8Array): unknown;
}

export interface LinkState {
  url: string;
  params: string;
}

interface WrapAtom {
  value: string;
  width: number;
  breakable: boolean;
  newline: boolean;
}

/**
 * Writer that closes ANSI style/link state before line breaks and reapplies it
 * afterwards, preventing wrapped styles from leaking into terminal margins.
 */
export class WrapWriter {
  private readonly sgr = new SgrState();
  private activeLink: LinkState = { url: '', params: '' };
  private closed = false;
  private readonly stream = new AnsiStreamDecoder();
  constructor(private readonly target: WritableLike) {}

  style(): string {
    return this.sgr.toString();
  }

  link(): LinkState {
    return { ...this.activeLink };
  }

  write(chunk: string | Uint8Array): number {
    const count = typeof chunk === 'string' ? utf8Encoder.encode(chunk).byteLength : chunk.byteLength;
    if (this.closed) return count;
    const input = this.stream.push(chunk);

    let output = '';
    for (const token of ansiTokens(input)) {
      if (token.ansi) {
        this.readControl(token.value);
        output += token.value;
        continue;
      }
      const parts = token.value.split('\n');
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          if (this.sgr.toString()) output += '\x1b[0m';
          if (this.activeLink.url) output += resetHyperlink();
          output += '\n';
          if (this.activeLink.url) {
            output += `\x1b]8;${this.activeLink.params};${this.activeLink.url}\x1b\\`;
          }
          output += this.sgr.toString();
        }
        output += parts[i];
      }
    }
    if (output) this.target.write(output);
    return count;
  }

  close(): void {
    if (this.closed) return;
    const trailing = this.stream.finish();
    if (trailing) this.target.write(trailing);
    let suffix = '';
    if (this.sgr.toString()) suffix += '\x1b[0m';
    if (this.activeLink.url) suffix += resetHyperlink();
    if (suffix) this.target.write(suffix);
    this.closed = true;
  }

  private readControl(sequence: string): void {
    this.sgr.apply(sequence);

    const link = /^(?:\x1b\]|\x9d)8;([^;]*);(.*?)(?:\x07|\x1b\\|\x9c)$/.exec(sequence);
    if (link) this.activeLink = link[2] ? { params: link[1], url: link[2] } : { url: '', params: '' };
  }
}

export function newWrapWriter(target: WritableLike): WrapWriter {
  return new WrapWriter(target);
}

/** Wrap at terminal-cell width while preserving graphemes, SGR, and OSC 8. */
export function wrap(input: string, width: number, breakpoints = ''): string {
  if (width <= 0) return input;
  const breaks = new Set(graphemes(breakpoints));
  const atoms: WrapAtom[] = [];
  for (const event of ansiGraphemeEvents(input)) {
    if (event.kind === 'ansi') {
      atoms.push({ value: event.value, width: 0, breakable: false, newline: false });
      continue;
    }
    atoms.push({
      value: event.parts.map(part => part.value).join(''),
      width: event.width,
      breakable: /\s/u.test(event.value) || breaks.has(event.value),
      newline: event.value === '\n',
    });
  }

  const output: WrapAtom[] = [];
  let lineWidth = 0;
  let lineStart = 0;
  let lastBreak = -1;
  for (const atom of atoms) {
    if (atom.newline) {
      output.push(atom);
      lineWidth = 0;
      lineStart = output.length;
      lastBreak = -1;
      continue;
    }
    if (atom.width > 0 && lineWidth + atom.width > width) {
      if (lastBreak >= lineStart) {
        output[lastBreak] = { value: '\n', width: 0, breakable: false, newline: true };
        lineStart = lastBreak + 1;
        lineWidth = 0;
        lastBreak = -1;
        for (let i = lineStart; i < output.length; i++) {
          lineWidth += output[i].width;
          if (output[i].breakable) lastBreak = i;
        }
      } else if (lineWidth > 0) {
        output.push({ value: '\n', width: 0, breakable: false, newline: true });
        lineStart = output.length;
        lineWidth = 0;
        lastBreak = -1;
      }
    }
    // Whitespace used as the wrapping breakpoint should not indent the next line.
    if (atom.breakable && lineWidth === 0 && /\s/u.test(atom.value)) continue;
    output.push(atom);
    lineWidth += atom.width;
    if (atom.breakable) lastBreak = output.length - 1;
  }

  let result = '';
  const writer = new WrapWriter({ write: chunk => { result += String(chunk); } });
  writer.write(output.map(atom => atom.value).join(''));
  writer.close();
  return result;
}
