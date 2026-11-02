import { ansiTokens, stripAnsi } from './ansi.js';
import { convert16, convert256 } from './colorconvert.js';
import type { ColorProfile, RGBColor } from './color.js';
import { AnsiStreamDecoder } from './stream.js';

const utf8Encoder = new TextEncoder();

export interface OutputStream {
  write(chunk: string): unknown;
  isTTY?: boolean;
}

export interface RendererOptions {
  profile?: ColorProfile;
  output?: OutputStream;
  env?: Record<string, string | undefined>;
}

function runtimeEnv(): Record<string, string | undefined> {
  return typeof process === 'undefined' ? {} : process.env;
}

function runtimeOutput(): OutputStream {
  if (typeof process !== 'undefined' && process.stdout) return process.stdout;
  const runtimes = globalThis as typeof globalThis & {
    Bun?: { stdout: unknown; write(target: unknown, chunk: string): unknown; isTTY?(fd: number): boolean };
    Deno?: { stdout: { writeSync(chunk: Uint8Array): number; isTerminal?(): boolean } };
  };
  if (runtimes.Bun) {
    return {
      write: chunk => runtimes.Bun!.write(runtimes.Bun!.stdout, chunk),
      isTTY: runtimes.Bun.isTTY?.(1),
    };
  }
  if (runtimes.Deno) {
    return {
      write: chunk => runtimes.Deno!.stdout.writeSync(utf8Encoder.encode(chunk)),
      isTTY: runtimes.Deno.stdout.isTerminal?.(),
    };
  }
  return {
    isTTY: false,
    write: () => { throw new Error('No raw stdout API is available in this runtime'); },
  };
}

function envBool(value: string | undefined): boolean {
  return /^(?:1|t|true)$/i.test(value ?? '');
}

export function detectColorProfile(
  output: Pick<OutputStream, 'isTTY'> = runtimeOutput(),
  env: Record<string, string | undefined> = runtimeEnv(),
): ColorProfile {
  const forced = envBool(env.CLICOLOR_FORCE);
  const term = env.TERM ?? '';
  if (term === 'dumb' && !forced) return 'notty';
  if (!output.isTTY && !forced) return 'notty';
  if (!term && !forced) return 'notty';
  if (output.isTTY && envBool(env.NO_COLOR)) return 'ascii';
  if (/^(?:screen|tmux)/i.test(term)) return 'ansi256';
  if (
    /(?:alacritty|contour|foot|ghostty|kitty|rio|st|wezterm)/i.test(term) ||
    /^(?:truecolor|24bit|yes|true)$/i.test(env.COLORTERM ?? '') ||
    env.WT_SESSION || envBool(env.GOOGLE_CLOUD_SHELL) || /direct$/i.test(term)
  ) {
    return 'truecolor';
  }
  if (/256color$/i.test(term)) return 'ansi256';
  return 'ansi';
}

function basicSgr(channel: number, index: number): number[] {
  const base = channel === 38 ? 30 : 40;
  return [index < 8 ? base + index : base + 60 + index - 8];
}

const nearestIndex = (rgb: RGBColor): number => convert256(rgb.r, rgb.g, rgb.b);
const nearestBasicIndex = (rgb: RGBColor): number => convert16(nearestIndex(rgb));

/** A colour parameter as a byte, wrapping like Go's uint8 conversion in x/ansi. */
function byte(param: string): number {
  return (Number(param) || 0) & 0xff;
}

function downsampleSgr(sequence: string, profile: ColorProfile): string {
  const match = /^(?:\x1b\[|\x9b)([0-9;:]*)m$/.exec(sequence);
  if (!match || profile === 'truecolor') return sequence;
  const normalized = match[1]
    .replace(/(38|48|58):2::?(\d+):(\d+):(\d+)/g, '$1;2;$2;$3;$4')
    .replace(/(38|48|58):5:(\d+)/g, '$1;5;$2');
  const params = normalized === '' ? ['0'] : normalized.split(';');
  const result: string[] = [];
  let sawColor = false;
  for (let index = 0; index < params.length; index++) {
    const channel = Number(params[index]);
    if ((channel === 38 || channel === 48 || channel === 58) && Number(params[index + 1]) === 2 && index + 4 < params.length) {
      sawColor = true;
      if (profile !== 'ascii' && (profile !== 'ansi' || channel !== 58)) {
        const rgb = { r: byte(params[index + 2]), g: byte(params[index + 3]), b: byte(params[index + 4]) };
        if (profile === 'ansi256') result.push(String(channel), '5', String(nearestIndex(rgb)));
        else result.push(...basicSgr(channel, nearestBasicIndex(rgb)).map(String));
      }
      index += 4;
    } else if ((channel === 38 || channel === 48 || channel === 58) && Number(params[index + 1]) === 5 && index + 2 < params.length) {
      sawColor = true;
      if (profile !== 'ascii' && (profile !== 'ansi' || channel !== 58)) {
        const indexed = byte(params[index + 2]);
        if (profile === 'ansi256') result.push(String(channel), '5', String(indexed));
        else result.push(...basicSgr(channel, convert16(indexed)).map(String));
      }
      index += 2;
    } else if (
      profile === 'ascii' &&
      ((channel >= 30 && channel <= 37) || (channel >= 40 && channel <= 49) ||
       (channel >= 90 && channel <= 97) || (channel >= 100 && channel <= 107) ||
       channel === 39 || channel === 59)
    ) {
      sawColor = true;
    } else {
      // Like colorprofile, write a reset (parameter 0) as an empty parameter:
      // `ESC[0m` becomes `ESC[m`.
      const colourParam = index > 0 && [38, 48, 58].includes(Number(params[index - 1]));
      result.push(channel === 0 && !colourParam ? '' : params[index]);
    }
  }
  if (result.length > 0) return `\x1b[${result.join(';')}m`;
  return sawColor ? '' : sequence;
}

/** Downsample every ANSI color while preserving non-color terminal controls. */
export function renderColorProfile(input: string, profile: ColorProfile): string {
  if (profile === 'notty') return stripAnsi(input);
  if (profile === 'truecolor') return input;
  let output = '';
  for (const token of ansiTokens(input)) {
    output += token.ansi ? downsampleSgr(token.value, profile) : token.value;
  }
  return output;
}

/** Explicit renderer for applications that need deterministic output profiles. */
export class Renderer {
  private currentProfile: ColorProfile;

  constructor(options: RendererOptions = {}) {
    this.currentProfile = options.profile ?? detectColorProfile(
      options.output ?? runtimeOutput(),
      options.env ?? runtimeEnv(),
    );
  }

  profile(): ColorProfile {
    return this.currentProfile;
  }

  setProfile(profile: ColorProfile): this {
    this.currentProfile = profile;
    return this;
  }

  render(input: string): string {
    return renderColorProfile(input, this.currentProfile);
  }
}

export class ColorProfileWriter {
  profile: ColorProfile;
  private readonly stream = new AnsiStreamDecoder();
  private closed = false;
  constructor(
    readonly forward: OutputStream,
    profile = detectColorProfile(forward),
  ) {
    this.profile = profile;
  }

  write(chunk: string | Uint8Array): number {
    const count = typeof chunk === 'string' ? utf8Encoder.encode(chunk).byteLength : chunk.byteLength;
    if (this.closed) return count;
    const input = this.stream.push(chunk);
    if (input) this.forward.write(renderColorProfile(input, this.profile));
    return count;
  }

  close(): void {
    if (this.closed) return;
    const trailing = this.stream.finish();
    if (trailing) this.forward.write(renderColorProfile(trailing, this.profile));
    this.closed = true;
  }

  end(): void {
    this.close();
  }
}

export const writer = new ColorProfileWriter(runtimeOutput());
export const Writer = writer;

function stringify(values: readonly unknown[], separator: string): string {
  return values.map(value => String(value)).join(separator);
}

function format(template: string, values: readonly unknown[]): string {
  let index = 0;
  const output = template.replace(/%[sdv%]/g, token => {
    if (token === '%%') return '%';
    if (index >= values.length) return token;
    const value = values[index++];
    if (token === '%d') return Number(value).toString();
    return String(value);
  });
  return output + (index < values.length ? stringify(values.slice(index), '') : '');
}

export function fprint(output: OutputStream, ...values: unknown[]): number {
  return new ColorProfileWriter(output).write(stringify(values, ''));
}

export function fprintln(output: OutputStream, ...values: unknown[]): number {
  return new ColorProfileWriter(output).write(stringify(values, ' ') + '\n');
}

export function fprintf(output: OutputStream, template: string, ...values: unknown[]): number {
  return new ColorProfileWriter(output).write(format(template, values));
}

export function print(...values: unknown[]): number {
  return writer.write(stringify(values, ''));
}

export function println(...values: unknown[]): number {
  return writer.write(stringify(values, ' ') + '\n');
}

export function printf(template: string, ...values: unknown[]): number {
  return writer.write(format(template, values));
}

export function sprint(...values: unknown[]): string {
  return renderColorProfile(stringify(values, ''), writer.profile);
}

export function sprintln(...values: unknown[]): string {
  return renderColorProfile(stringify(values, ' ') + '\n', writer.profile);
}

export function sprintf(template: string, ...values: unknown[]): string {
  return renderColorProfile(format(template, values), writer.profile);
}
