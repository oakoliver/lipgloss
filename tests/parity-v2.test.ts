import { describe, expect, it } from 'bun:test';
import {
  Bottom,
  Canvas,
  ColorProfileWriter,
  Top,
  Center,
  Left,
  NO_COLOR,
  Renderer,
  blend1D,
  blend2D,
  color,
  detectColorProfile,
  complete,
  graphemes,
  height,
  joinHorizontal,
  newCompositor,
  newLayer,
  newRange,
  newStyle,
  normalBorder,
  placeHorizontal,
  newWrapWriter,
  renderColorProfile,
  size,
  stringWidth,
  stripAnsi,
  sliceAnsi,
  styleRanges,
  styleRunes,
  truncate,
  width,
  withWhitespaceChars,
  withWhitespaceStyle,
  wrap,
} from '../src/index.js';

describe('Lip Gloss v2.0.5 Unicode cell semantics', () => {
  it('measures extended emoji clusters as one two-cell glyph', () => {
    expect(graphemes('👨‍👩‍👧‍👦')).toEqual(['👨‍👩‍👧‍👦']);
    expect(stringWidth('👨‍👩‍👧‍👦')).toBe(2);
    expect(stringWidth('🇵🇹')).toBe(2);
    expect(stringWidth('👍🏽')).toBe(2);
    expect(stringWidth('1️⃣')).toBe(2);
  });

  it('distinguishes text-default pictographs from VS16 emoji presentation', () => {
    for (const symbol of ['⚙', '✂', '❤', '✡']) expect(stringWidth(symbol)).toBe(1);
    for (const symbol of ['⚙️', '✂️', '❤️', '✡️']) expect(stringWidth(symbol)).toBe(2);
  });

  it('measures combining text and variation selectors without extra cells', () => {
    expect(stringWidth('e\u0301')).toBe(1);
    expect(stringWidth('❤️')).toBe(2);
    expect(stringWidth('\u200d')).toBe(0);
  });

  it('ignores 7-bit and C1 CSI/OSC controls during measurement', () => {
    expect(stringWidth('\x9b31mred\x9b0m')).toBe(3);
    expect(stripAnsi('\x9d8;;https://example.com\x9clink\x9d8;;\x9c')).toBe('link');
  });

  it('never splits a grapheme while truncating ANSI text', () => {
    const input = '\x1b[31mA👨‍👩‍👧‍👦B\x1b[0m';
    expect(stripAnsi(truncate(input, 2))).toBe('A');
    expect(stripAnsi(truncate(input, 3))).toBe('A👨‍👩‍👧‍👦');
  });

  it('closes a C1 OSC 8 hyperlink when truncation cuts its linked text', () => {
    const output = truncate('\x9d8;;https://example.com\x9clink\x9d8;;\x9c', 1);
    expect(stripAnsi(output)).toBe('l');
    expect(output.endsWith('\x1b]8;;\x1b\\')).toBe(true);
  });


  it('clusters ANSI-interposed ZWJ emoji before truncating', () => {
    const input = '👩\x1b[31m\u200d⚕️X';
    const output = truncate(input, 2);
    expect(stripAnsi(output)).toBe('👩\u200d⚕️');
    expect(stringWidth(output)).toBe(2);
  });

  it('slices ANSI-interposed ZWJ and combining graphemes only at cell boundaries', () => {
    const emoji = 'A👩\x1b[31m\u200d⚕️B';
    expect(stripAnsi(sliceAnsi(emoji, 1, 3))).toBe('👩\u200d⚕️');
    expect(stringWidth(sliceAnsi(emoji, 2, 3))).toBe(2);
    expect(stripAnsi(sliceAnsi(emoji, 3, 4))).toBe('B');
    expect(stripAnsi(sliceAnsi('e\x1b[31m\u0301X', 0, 1))).toBe('e\u0301');
  });
  it('reports maximum line width and newline height', () => {
    expect(width('A\n界界')).toBe(4);
    expect(height('A\n')).toBe(2);
    expect(size('\x1b[1m👍🏽\x1b[0m\nabc')).toEqual({ width: 3, height: 2 });
  });
});

describe('v2 style contracts', () => {
  it('keeps transform and font rules but not dimensions or hyperlinks during inheritance', () => {
    const parent = newStyle()
      .bold(true)
      .transform(value => value.toUpperCase())
      .padding(2)
      .margin(3)
      .hyperlink('https://example.com');
    const inherited = newStyle().inherit(parent);
    expect(stripAnsi(inherited.render('hello'))).toBe('HELLO');
    expect(inherited.getBold()).toBe(true);
    expect(inherited.getPaddingTop()).toBe(0);
    expect(inherited.getMarginTop()).toBe(0);
    expect(inherited.getHyperlink().link).toBe('');
  });

  it('inline removes newlines and disables physical box rules', () => {
    const output = newStyle()
      .padding(1)
      .margin(1)
      .border(normalBorder())
      .inline(true)
      .render('A\nB');
    expect(stripAnsi(output)).toBe('AB');
  });

  it('supports margin characters and aggregate unsets', () => {
    const style = newStyle().margin(0, 2).marginChar('.');
    expect(stripAnsi(style.render('x'))).toBe('..x..');
    const unset = style.padding(1).align(Center, Bottom).unsetMargins().unsetPadding().unsetAlign();
    expect(unset.getMargin()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(unset.getPadding()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(unset.getAlign()).toBe(Left);
  });

  it('supports fractional horizontal and vertical style alignment', () => {
    expect(stripAnsi(newStyle().width(5).alignHorizontal(0.25).render('x'))).toBe(' x   ');
    const lines = stripAnsi(newStyle().height(5).alignVertical(0.25).render('x')).split('\n');
    expect(lines.findIndex(line => line.includes('x'))).toBe(1);
  });

  it('retains default, disabled, and removed tab conversion behavior', () => {
    expect(newStyle().render('[\t]')).toBe('[    ]');
    expect(newStyle().tabWidth(0).render('[\t]')).toBe('[]');
    expect(newStyle().tabWidth(-1).render('[\t]')).toBe('[\t]');
    expect(newStyle().tabWidth(8).unsetTabWidth().render('[\t]')).toBe('[    ]');
  });
});

describe('ANSI-aware layout, wrapping, and ranges', () => {
  it('joins ANSI and wide graphemes by visible cells', () => {
    const red = '\x1b[31m界\x1b[0m';
    const output = joinHorizontal(Center, 'a\nb\nc', red);
    const lines = output.split('\n');
    expect(lines.map(line => stringWidth(line))).toEqual([3, 3, 3]);
    expect(stripAnsi(lines[1])).toContain('界');
  });

  it('places patterned styled whitespace without zero-width loops', () => {
    const result = placeHorizontal(
      5,
      Left,
      'x',
      withWhitespaceChars('*'),
      withWhitespaceStyle(newStyle().bold(true)),
    );
    expect(stripAnsi(result)).toBe('x****');
    expect(placeHorizontal(3, Left, 'x', withWhitespaceChars('\u200d'))).toContain('  ');
    expect(placeHorizontal(4, Left, 'x', withWhitespaceChars('界'))).toBe('x界 ');
  });

  it('normalizes CRLF and tabs before joining and placement', () => {
    const joined = joinHorizontal(Top, 'a\r\nb', '\tX');
    expect(joined).toBe('a    X\nb     ');
    expect(placeHorizontal(6, Left, '\tX')).toBe('    X ');
  });

  it('wraps on cell boundaries and carries ANSI state across lines', () => {
    const result = wrap('\x1b[31mhello world\x1b[0m', 5);
    expect(stripAnsi(result)).toBe('hello\nworld');
    expect(result).toContain('\x1b[0m\n\x1b[31m');
  });

  it('styles cell ranges while preserving pre-existing ANSI', () => {
    const input = 'hello \x1b[32mworld\x1b[0m';
    const output = styleRanges(input, newRange(0, 5, newStyle().bold(true)));
    expect(stripAnsi(output)).toBe('hello world');
    expect(output).toContain('\x1b[32mworld');
  });

  it('wraps ANSI-interposed ZWJ emoji as one cell cluster', () => {
    const output = wrap('👩\x1b[31m\u200d⚕️X', 2);
    expect(stripAnsi(output)).toBe('👩\u200d⚕️\nX');
    expect(stringWidth(stripAnsi(output).split('\n')[0])).toBe(2);
  });

  it('styles Unicode code-point indices in adjacent groups', () => {
    const output = styleRunes('a狐b', [1], newStyle().reverse(true), newStyle());
    expect(stripAnsi(output)).toBe('a狐b');
    expect(output).toContain('\x1b[7m狐');
  });
});

describe('profiles, gradients, borders, and layers', () => {
  it('detects non-TTY, NO_COLOR, tmux, and truecolor profiles deterministically', () => {
    expect(detectColorProfile({ isTTY: false }, {})).toBe('notty');
    expect(detectColorProfile({ isTTY: true }, { TERM: 'xterm', NO_COLOR: '1' })).toBe('ascii');
    expect(detectColorProfile({ isTTY: true }, { TERM: 'tmux', COLORTERM: 'truecolor' })).toBe('ansi256');
    expect(detectColorProfile({ isTTY: true }, { TERM: 'xterm-256color', COLORTERM: 'truecolor' })).toBe('truecolor');
  });

  it('treats missing TERM as NoTTY unless color is explicitly forced', () => {
    expect(detectColorProfile({ isTTY: true }, {})).toBe('notty');
    expect(detectColorProfile({ isTTY: true }, { TERM: '' })).toBe('notty');
    expect(detectColorProfile({ isTTY: true }, { TERM: '', CLICOLOR_FORCE: '0' })).toBe('notty');
    expect(detectColorProfile({ isTTY: true }, { TERM: '', CLICOLOR_FORCE: '1' })).toBe('ansi');
  });

  it('selects complete colors by profile', () => {
    expect(complete('ansi')(1, 100, '#abcdef')).toBe(1);
    expect(complete('ansi256')(1, 100, '#abcdef')).toBe(100);
    expect(complete('truecolor')(1, 100, '#abcdef')).toBe('#abcdef');
    expect(complete('ascii')(1, 100, '#abcdef')).toBe(NO_COLOR);
  });

  it('detects upstream truecolor TERM families without COLORTERM', () => {
    for (const term of ['xterm-kitty', 'alacritty', 'foot', 'ghostty', 'wezterm']) {
      expect(detectColorProfile({ isTTY: true }, { TERM: term })).toBe('truecolor');
    }
    expect(detectColorProfile({ isTTY: false }, { TERM: 'xterm-kitty' })).toBe('notty');
    expect(detectColorProfile({ isTTY: true }, { TERM: 'xterm-kitty', NO_COLOR: '1' })).toBe('ascii');
    expect(detectColorProfile({ isTTY: true }, { TERM: 'xterm-kitty', NO_COLOR: '0' })).toBe('truecolor');
    expect(detectColorProfile({ isTTY: true }, { TERM: 'xterm', GOOGLE_CLOUD_SHELL: '0' })).toBe('ansi');
    expect(detectColorProfile({ isTTY: true }, { TERM: 'xterm', GOOGLE_CLOUD_SHELL: '1' })).toBe('truecolor');
  });

  it('buffers split UTF-8 and ANSI controls in color profile writers', () => {
    const chunks: string[] = [];
    const profileWriter = new ColorProfileWriter({ write: chunk => chunks.push(chunk) }, 'ansi256');
    const glyph = new TextEncoder().encode('界');
    profileWriter.write(glyph.slice(0, 2));
    expect(chunks).toEqual([]);
    profileWriter.write('!');
    expect(chunks).toEqual([]);
    profileWriter.write(glyph.slice(2));
    profileWriter.write('\x1b[38;2;255;');
    profileWriter.write('0;0mR');
    profileWriter.close();
    expect(chunks.join('')).toContain('界!');
    expect(chunks.join('')).toContain('\x1b[38;5;196mR');
  });

  it('preserves mixed byte/string order while completing wrap-writer UTF-8', () => {
    const chunks: string[] = [];
    const wrapWriter = newWrapWriter({ write: chunk => chunks.push(String(chunk)) });
    const glyph = new TextEncoder().encode('界');
    wrapWriter.write(glyph.slice(0, 2));
    wrapWriter.write('!');
    expect(chunks).toEqual([]);
    wrapWriter.write(glyph.slice(2));
    wrapWriter.close();
    expect(chunks.join('')).toBe('界!');
  });

  it('reports UTF-8 byte counts for WrapWriter string and byte writes', () => {
    const wrapWriter = newWrapWriter({ write: () => undefined });
    expect(wrapWriter.write('A')).toBe(1);
    expect(wrapWriter.write('界')).toBe(3);
    expect(wrapWriter.write('😀')).toBe(4);
    expect(wrapWriter.write(new Uint8Array([0x41, 0x42]))).toBe(2);
    wrapWriter.close();
  });

  it('buffers wrap-writer controls and restores split C1 OSC8/SGR state', () => {
    const chunks: string[] = [];
    const wrapWriter = newWrapWriter({ write: chunk => chunks.push(String(chunk)) });
    wrapWriter.write('\x1b[');
    expect(chunks).toEqual([]);
    wrapWriter.write('31m\x9d8;;https://example.com');
    wrapWriter.write('\x9cA\n');
    wrapWriter.close();
    const output = chunks.join('');
    expect(output).toContain('\x1b[0m\x1b]8;;\x1b\\\n');
    expect(output).toContain('\x1b]8;;https://example.com\x1b\\\x1b[31m');
  });

  it('downsamples colors, preserves ASCII styles, and strips non-TTY controls', () => {
    const input = '\x1b[38;2;255;0;0mred\x1b[0m';
    expect(renderColorProfile(input, 'ansi256')).toContain('\x1b[38;5;196m');
    expect(new Renderer({ profile: 'ansi' }).render(input)).toContain('\x1b[91m');
    const ascii = renderColorProfile(input, 'ascii');
    expect(stripAnsi(ascii)).toBe('red');
    expect(ascii).not.toContain('38;');
    expect(renderColorProfile('\x1b[1;38;2;255;0;0mred\x1b[0m', 'ascii')).toContain('\x1b[1m');
    expect(renderColorProfile(input, 'notty')).toBe('red');
  });


  it('drops unsupported ANSI underline colors without resetting other styles', () => {
    const underline = '\x1b[58;2;255;0;0m';
    expect(renderColorProfile(underline, 'ansi')).toBe('');
    expect(renderColorProfile(underline, 'ansi256')).toBe('\x1b[58;5;196m');
    expect(renderColorProfile('\x1b[1m\x1b[31mbold', 'ascii')).toBe('\x1b[1mbold');
  });
  it('ports CIELAB gradient stop distribution and edge handling', () => {
    const gradient = blend1D(5, { r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(gradient).toHaveLength(5);
    expect(gradient[1]).toMatchObject({ r: 59, g: 59, b: 59 });
    expect(blend2D(0, -1, 450, color('#f00'))).toHaveLength(1);
  });

  it('skips zero-cell border clusters while preserving total edge width', () => {
    const border = { ...normalBorder(), top: '\u200d-' };
    const output = stripAnsi(newStyle().width(3).border(border).render('x'));
    expect(output.split('\n')[0]).toBe('┌-┐');
  });

  it('fills odd border widths after a wide glyph without overshooting', () => {
    const border = { ...normalBorder(), top: '界' };
    const output = stripAnsi(newStyle().width(5).border(border).render('x'));
    expect(output.split('\n')[0]).toBe('┌界 ┐');
    expect(stringWidth(output.split('\n')[0])).toBe(5);
  });

  it('blends border foregrounds around the perimeter and exposes blend state', () => {
    const style = newStyle()
      .border(normalBorder())
      .borderForegroundBlend('#ff0000', '#0000ff')
      .borderForegroundBlendOffset(1);
    const output = style.render('x');
    expect(output).toContain('\x1b[38;2;');
    expect(style.getBorderForegroundBlend()).toEqual(['#ff0000', '#0000ff']);
    expect(style.getBorderForegroundBlendOffset()).toBe(1);
  });

  it('tracks channel-specific SGR resets in wrap writers', () => {
    const chunks: string[] = [];
    const wrapWriter = newWrapWriter({ write: chunk => chunks.push(String(chunk)) });
    wrapWriter.write('\x1b[1;31mA\x1b[39m\nB');
    wrapWriter.close();
    const output = chunks.join('');
    expect(output).toContain('\x1b[39m\x1b[0m\n\x1b[1mB');
    expect(output.slice(output.indexOf('\n'))).not.toContain('\x1b[31m');
  });

  it('renders canvas cells and trims plain trailing spaces', () => {
    const canvas = new Canvas(5, 2);
    for (let y = 0; y < canvas.height(); y++) {
      for (let x = 0; x < canvas.width(); x++) canvas.cellAt(x, y)!.content = x < 3 ? 'A' : ' ';
    }
    expect(canvas.render()).toBe('AAA\nAAA');
  });

  it('clears wide glyph metadata when a continuation is overwritten', () => {
    const canvas = new Canvas(3, 1);
    canvas.setCell(0, 0, {
      content: '界',
      style: '\x1b[31m',
      link: { url: 'https://example.com', params: '' },
    });
    canvas.setCell(1, 0, { content: 'X' });
    expect(canvas.cellAt(0, 0)).toEqual({ content: ' ' });
    expect(canvas.render()).toBe(' X');
    const clipped = new Canvas(1, 1);
    clipped.setCell(0, 0, {
      content: '界',
      style: '\x1b[31m',
      link: { url: 'https://example.com', params: '' },
    });
    expect(clipped.cellAt(0, 0)).toEqual({ content: ' ' });
    expect(clipped.render()).toBe('');
  });

  it('copies wide canvas lead cells without replaying continuations', () => {
    const source = new Canvas(2, 1);
    source.setCell(0, 0, { content: '界' });
    const destination = new Canvas(2, 1).compose(source);
    expect(destination.render()).toBe('界');
  });

  it('keeps combining marks on a wide lead cell across ANSI boundaries', () => {
    const canvas = new Canvas(3, 1).compose(newLayer('界\x1b[31m\u0301\x1b[0mX'));
    expect(stripAnsi(canvas.render())).toBe('界\u0301X');
  });

  it('draws ANSI-interposed ZWJ emoji as one styled-boundary cell cluster', () => {
    const canvas = new Canvas(3, 1).compose(newLayer('👩\x1b[31m\u200d⚕️X'));
    expect(canvas.cellAt(0, 0)?.content).toBe('👩\u200d⚕️');
    expect(canvas.cellAt(2, 0)?.style).toBe('\x1b[31m');
    expect(stripAnsi(canvas.render())).toBe('👩\u200d⚕️X');
    expect(stringWidth(canvas.render())).toBe(3);
  });

  it('stores only active SGR attributes after channel-specific resets', () => {
    const canvas = new Canvas(2, 1).compose(newLayer('\x1b[31mA\x1b[39mB'));
    expect(canvas.cellAt(0, 0)?.style).toBe('\x1b[31m');
    expect(canvas.cellAt(1, 0)?.style).toBeUndefined();
    expect(stripAnsi(canvas.render())).toBe('AB');
  });

  it('clears a layer area before drawing over reused canvas cells', () => {
    const bottom = newLayer('abc\nabc');
    const top = newLayer('X\n X').z(2);
    expect(stripAnsi(newCompositor(bottom, top).render())).toBe('X c\n Xc');
  });

  it('normalizes negative compositor bounds into the render canvas', () => {
    const compositor = newCompositor(newLayer('L').x(-2), newLayer('R'));
    expect(stripAnsi(compositor.render())).toBe('L R');
  });

  it('composes z-ordered layers and hit-tests the topmost ID', () => {
    const bottom = newLayer('bottom').id('bottom');
    const top = newLayer('TOP').id('top').x(1).z(2);
    const compositor = newCompositor(bottom, top);
    expect(stripAnsi(compositor.render())).toBe('bTOPom');
    expect(compositor.hit(1, 0).id()).toBe('top');
    expect(compositor.getLayer('bottom')).toBe(bottom);
  });
});
