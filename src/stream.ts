function completePrefixLength(input: string): number {
  for (let index = 0; index < input.length;) {
    const code = input.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 === input.length) return index;

    const c1String = code === 0x90 || code === 0x98 || code === 0x9d || code === 0x9e || code === 0x9f;
    if (code !== 0x1b && code !== 0x9b && !c1String) {
      index++;
      continue;
    }

    const start = index;
    if (code === 0x9b || input[index + 1] === '[') {
      index += code === 0x9b ? 1 : 2;
      let complete = false;
      while (index < input.length) {
        const next = input.charCodeAt(index++);
        if (next >= 0x40 && next <= 0x7e) {
          complete = true;
          break;
        }
      }
      if (!complete) return start;
      continue;
    }

    if (code === 0x9d || input[index + 1] === ']') {
      index += code === 0x9d ? 1 : 2;
      let complete = false;
      while (index < input.length) {
        const next = input.charCodeAt(index);
        if (next === 0x07 || next === 0x9c) {
          index++;
          complete = true;
          break;
        }
        if (next === 0x1b && input[index + 1] === '\\') {
          index += 2;
          complete = true;
          break;
        }
        index++;
      }
      if (!complete) return start;
      continue;
    }

    if (c1String || 'PX^_'.includes(input[index + 1] ?? '')) {
      index += c1String ? 1 : 2;
      let complete = false;
      while (index < input.length) {
        if (input.charCodeAt(index) === 0x9c) {
          index++;
          complete = true;
          break;
        }
        if (input.charCodeAt(index) === 0x1b && input[index + 1] === '\\') {
          index += 2;
          complete = true;
          break;
        }
        index++;
      }
      if (!complete) return start;
      continue;
    }

    if (index + 1 >= input.length) return start;
    index += 2;
  }
  return input.length;
}

function utf8SequenceLength(first: number): number {
  if (first >= 0xc2 && first <= 0xdf) return 2;
  if (first >= 0xe0 && first <= 0xef) return 3;
  if (first >= 0xf0 && first <= 0xf4) return 4;
  return 1;
}

/** Buffers split UTF-8, surrogate pairs, and ANSI controls until complete. */
export class AnsiStreamDecoder {
  private readonly decoder = new TextDecoder();
  private pendingBytes: number[] = [];
  private deferredText = '';
  private pending = '';

  push(chunk: string | Uint8Array): string {
    let decoded = '';
    if (typeof chunk === 'string') {
      if (this.pendingBytes.length > 0) {
        this.deferredText += chunk;
        return '';
      }
      decoded = chunk;
    } else {
      let index = 0;
      if (this.pendingBytes.length > 0) {
        const needed = utf8SequenceLength(this.pendingBytes[0]) - this.pendingBytes.length;
        const taken = Math.min(needed, chunk.length);
        for (let offset = 0; offset < taken; offset++) this.pendingBytes.push(chunk[offset]);
        index += taken;
        if (this.pendingBytes.length < utf8SequenceLength(this.pendingBytes[0])) return '';
        decoded += this.decoder.decode(Uint8Array.from(this.pendingBytes));
        this.pendingBytes = [];
        decoded += this.deferredText;
        this.deferredText = '';
      }
      while (index < chunk.length) {
        const length = utf8SequenceLength(chunk[index]);
        if (index + length > chunk.length) {
          this.pendingBytes = Array.from(chunk.slice(index));
          break;
        }
        decoded += this.decoder.decode(chunk.slice(index, index + length));
        index += length;
      }
    }
    const input = this.pending + decoded;
    const complete = completePrefixLength(input);
    this.pending = input.slice(complete);
    return input.slice(0, complete);
  }

  finish(): string {
    const bytes = this.pendingBytes.length > 0
      ? this.decoder.decode(Uint8Array.from(this.pendingBytes))
      : '';
    const result = this.pending + bytes + this.deferredText;
    this.pending = '';
    this.pendingBytes = [];
    this.deferredText = '';
    return result;
  }
}
