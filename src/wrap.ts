import { ansiGraphemeEvents, ansiTokens, resetHyperlink, setHyperlink } from './ansi.js';
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
          if (this.sgr.toString()) output += '\x1b[m'; // ansi.ResetStyle
          if (this.activeLink.url) output += resetHyperlink();
          output += '\n';
          if (this.activeLink.url) {
            output += setHyperlink(this.activeLink.url, this.activeLink.params);
          }
          output += this.sgr.toString();
        }
        output += parts[i];
      }
    }
    if (output) this.target.write(output);
    return count;
  }

  /**
   * @internal Return (without writing) input held back while waiting for a
   * split escape sequence or UTF-8 character to complete. Go's byte-wise
   * writer has already passed such bytes through by this point.
   */
  flushPending(): string {
    return this.stream.finish();
  }

  close(): void {
    if (this.closed) return;
    const trailing = this.stream.finish();
    if (trailing) this.target.write(trailing);
    let suffix = '';
    if (this.sgr.toString()) suffix += '\x1b[m'; // ansi.ResetStyle
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

// Go's unicode.IsSpace (Unicode White_Space). JavaScript's \s differs: it
// includes U+FEFF and omits U+0085.
function isGoSpace(cp: number): boolean {
  if (cp < 0x80) return cp === 0x20 || (cp >= 0x09 && cp <= 0x0d);
  return cp === 0x85 || cp === 0xa0 || cp === 0x1680 || (cp >= 0x2000 && cp <= 0x200a) ||
    cp === 0x2028 || cp === 0x2029 || cp === 0x202f || cp === 0x205f || cp === 0x3000;
}

const NBSP = 0xa0;

/**
 * Wrap at terminal-cell width while preserving graphemes, SGR, and OSC 8.
 *
 * Faithful port of charmbracelet/x/ansi `Wrap` (used by lipgloss v2 `Wrap`):
 * leading indentation and whitespace inside a line are preserved; only the
 * whitespace at a soft-wrap point is dropped. `-` is always a breakpoint.
 */
export function wrap(input: string, width: number, breakpoints = ''): string {
  const limit = width;
  if (limit < 1) return input;
  const breaks = new Set(Array.from(breakpoints, ch => ch.codePointAt(0)!));

  let buf = '';
  let word = '';
  let space = '';
  let spaceWidth = 0; // width of the space buffer
  let curWidth = 0; // written width of the line
  let wordLen = 0; // word buffer width without ANSI escape codes

  const addSpace = () => {
    if (spaceWidth === 0 && space.length === 0) return;
    curWidth += spaceWidth;
    buf += space;
    space = '';
    spaceWidth = 0;
  };
  const addWord = () => {
    if (word.length === 0) return;
    addSpace();
    curWidth += wordLen;
    buf += word;
    word = '';
    wordLen = 0;
  };
  const addNewline = () => {
    buf += '\n';
    curWidth = 0;
    space = '';
    spaceWidth = 0;
  };
  const flushTrailingSpace = () => {
    if (wordLen === 0) {
      if (curWidth + spaceWidth > limit) curWidth = 0;
      else buf += space; // preserve whitespace
      space = '';
      spaceWidth = 0;
    }
  };

  // Single-byte (ASCII / C0) path of the Go parser.
  const handleAscii = (ch: string) => {
    const cp = ch.charCodeAt(0);
    if (ch === '\n') {
      flushTrailingSpace();
      addWord();
      addNewline();
    } else if (isGoSpace(cp)) {
      addWord();
      space += ch;
      spaceWidth++;
    } else if (ch === '-' || breaks.has(cp)) {
      addSpace();
      if (curWidth + wordLen >= limit) {
        // Can't fit the breakpoint on the current line; treat it as a word.
        word += ch;
        wordLen++;
      } else {
        addWord();
        buf += ch;
        curWidth++;
      }
    } else {
      if (curWidth === limit) addNewline();
      word += ch;
      wordLen++;
      if (wordLen === limit) addWord(); // hard-wrap a too-long word
      if (curWidth + wordLen + spaceWidth > limit) addNewline();
    }
  };

  // Multi-byte grapheme cluster path of the Go parser. `value` may contain
  // interposed ANSI controls; `text` is the cluster without them.
  const handleCluster = (value: string, text: string, w: number) => {
    const cp = text.codePointAt(0)!;
    if (isGoSpace(cp) && cp !== NBSP) {
      addWord();
      space += value;
      spaceWidth += w;
    } else if (breaks.size > 0 && Array.from(text).some(c => breaks.has(c.codePointAt(0)!))) {
      addSpace();
      if (curWidth + wordLen + w > limit) {
        word += value;
        wordLen += w;
      } else {
        addWord();
        buf += value;
        curWidth += w;
      }
    } else {
      if (wordLen + w > limit) addWord(); // hard-wrap a too-long word
      word += value;
      wordLen += w;
      if (curWidth + wordLen + spaceWidth > limit) addNewline();
      if (wordLen === limit) addWord();
    }
  };

  // Go walks bytes: ASCII bytes are handled one at a time, and only a
  // non-ASCII lead byte starts a grapheme cluster. (Unlike Go, a cluster with
  // ANSI interposed, e.g. inside a ZWJ emoji, is kept whole.)
  const handleText = (text: string) => {
    for (const event of ansiGraphemeEvents(text)) {
      if (event.kind === 'ansi') {
        word += event.value; // zero-width, travels with the word
      } else if (event.value.charCodeAt(0) < 0x80) {
        handleAscii(event.value[0]);
        const rest = event.parts.map(p => p.value).join('').slice(1);
        if (rest) handleText(rest);
      } else {
        handleCluster(event.parts.map(p => p.value).join(''), event.value, event.width);
      }
    }
  };

  handleText(input);

  flushTrailingSpace();
  addWord();

  // Upstream returns buf.String() before its deferred WrapWriter.Close runs,
  // so the style/link resets Close would append never reach the result: an
  // unclosed link or style in the input stays open, exactly as in Go.
  let result = '';
  const writer = new WrapWriter({ write: chunk => { result += String(chunk); } });
  writer.write(buf);
  const trailing = writer.flushPending();
  if (trailing) result += trailing;
  return result;
}
