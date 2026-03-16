import { describe, expect, it } from 'bun:test';
import {
  SGR, stringWidth, stripAnsi, truncate, styled,
  fgColor, fgAnsi256, fgBasic, bgColor, bgAnsi256, bgBasic,
  ulColor, ulAnsi256, setHyperlink, resetHyperlink,
} from '../src/ansi.js';

describe('SGR constants', () => {
  it('should have correct reset code', () => {
    expect(SGR.reset).toBe('\x1b[0m');
  });
  it('should have correct bold code', () => {
    expect(SGR.bold).toBe('\x1b[1m');
  });
  it('should have correct italic code', () => {
    expect(SGR.italic).toBe('\x1b[3m');
  });
  it('should have correct underline code', () => {
    expect(SGR.underline).toBe('\x1b[4m');
  });
  it('should have correct strikethrough code', () => {
    expect(SGR.strikethrough).toBe('\x1b[9m');
  });
  it('should have correct reverse code', () => {
    expect(SGR.reverse).toBe('\x1b[7m');
  });
  it('should have underline style codes', () => {
    expect(SGR.underlineDouble).toBe('\x1b[4:2m');
    expect(SGR.underlineCurly).toBe('\x1b[4:3m');
    expect(SGR.underlineDotted).toBe('\x1b[4:4m');
    expect(SGR.underlineDashed).toBe('\x1b[4:5m');
  });
});

describe('fgColor / bgColor / ulColor', () => {
  it('should produce RGB foreground escape', () => {
    expect(fgColor(255, 0, 128)).toBe('\x1b[38;2;255;0;128m');
  });
  it('should produce RGB background escape', () => {
    expect(bgColor(0, 255, 64)).toBe('\x1b[48;2;0;255;64m');
  });
  it('should produce ANSI 256 foreground escape', () => {
    expect(fgAnsi256(196)).toBe('\x1b[38;5;196m');
  });
  it('should produce ANSI 256 background escape', () => {
    expect(bgAnsi256(21)).toBe('\x1b[48;5;21m');
  });
  it('should produce basic foreground (0-7)', () => {
    expect(fgBasic(0)).toBe('\x1b[30m');
    expect(fgBasic(7)).toBe('\x1b[37m');
  });
  it('should produce bright foreground (8-15)', () => {
    expect(fgBasic(8)).toBe('\x1b[90m');
    expect(fgBasic(15)).toBe('\x1b[97m');
  });
  it('should produce basic background (0-7)', () => {
    expect(bgBasic(0)).toBe('\x1b[40m');
    expect(bgBasic(7)).toBe('\x1b[47m');
  });
  it('should produce bright background (8-15)', () => {
    expect(bgBasic(8)).toBe('\x1b[100m');
  });
  it('should produce underline color RGB', () => {
    expect(ulColor(128, 64, 32)).toBe('\x1b[58;2;128;64;32m');
  });
  it('should produce underline color 256', () => {
    expect(ulAnsi256(100)).toBe('\x1b[58;5;100m');
  });
});

describe('hyperlink', () => {
  it('should produce OSC hyperlink sequence', () => {
    expect(setHyperlink('https://example.com')).toBe('\x1b]8;;https://example.com\x1b\\');
  });
  it('should produce reset hyperlink', () => {
    expect(resetHyperlink()).toBe('\x1b]8;;\x1b\\');
  });
  it('should include params in hyperlink', () => {
    expect(setHyperlink('https://example.com', 'id=foo')).toBe('\x1b]8;id=foo;https://example.com\x1b\\');
  });
});

describe('stripAnsi', () => {
  it('should strip bold codes', () => {
    expect(stripAnsi('\x1b[1mHello\x1b[0m')).toBe('Hello');
  });
  it('should strip color codes', () => {
    expect(stripAnsi('\x1b[38;2;255;0;0mRed\x1b[0m')).toBe('Red');
  });
  it('should leave plain text untouched', () => {
    expect(stripAnsi('Hello World')).toBe('Hello World');
  });
  it('should strip multiple nested codes', () => {
    expect(stripAnsi('\x1b[1m\x1b[31mBold Red\x1b[0m')).toBe('Bold Red');
  });
});

describe('stringWidth', () => {
  it('should return correct width for ASCII', () => {
    expect(stringWidth('Hello')).toBe(5);
  });
  it('should ignore ANSI codes', () => {
    expect(stringWidth('\x1b[1mHello\x1b[0m')).toBe(5);
  });
  it('should count CJK characters as width 2', () => {
    // 日本語 has 3 CJK characters, each width 2
    expect(stringWidth('日本語')).toBe(6);
  });
  it('should handle empty string', () => {
    expect(stringWidth('')).toBe(0);
  });
  it('should handle mixed ASCII and CJK', () => {
    expect(stringWidth('Hi日本')).toBe(6); // 2 + 2 + 2
  });
});

describe('truncate', () => {
  it('should return original string if within width', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });
  it('should truncate long strings', () => {
    expect(truncate('Hello World', 5)).toBe('Hello');
  });
  it('should return empty for width 0', () => {
    expect(truncate('Hello', 0)).toBe('');
  });
  it('should handle ANSI codes correctly', () => {
    const s = '\x1b[1mHello World\x1b[0m';
    const result = truncate(s, 5);
    // Should still contain the bold code and 5 visible chars
    expect(stripAnsi(result)).toBe('Hello');
  });
});

describe('styled', () => {
  it('should wrap text with bold', () => {
    const result = styled('Hi', { bold: true });
    expect(result).toBe('\x1b[1mHi\x1b[0m');
  });
  it('should wrap with multiple attributes', () => {
    const result = styled('Hi', { bold: true, italic: true });
    expect(result).toContain('\x1b[1m');
    expect(result).toContain('\x1b[3m');
    expect(result).toContain('Hi');
    expect(result).toEndWith('\x1b[0m');
  });
  it('should add foreground color', () => {
    const result = styled('Hi', { fg: { type: 'rgb', value: 0, r: 255, g: 0, b: 0 } });
    expect(result).toContain('\x1b[38;2;255;0;0m');
    expect(result).toContain('Hi');
  });
  it('should add background color', () => {
    const result = styled('Hi', { bg: { type: 'ansi256', value: 196 } });
    expect(result).toContain('\x1b[48;5;196m');
  });
  it('should return plain text when no options', () => {
    const result = styled('Hi', {});
    expect(result).toBe('Hi');
  });
  it('should handle underline styles', () => {
    const result = styled('Hi', { underlineStyle: 'double' });
    expect(result).toContain('\x1b[4:2m');
  });
  it('should handle strikethrough', () => {
    const result = styled('Hi', { strikethrough: true });
    expect(result).toContain('\x1b[9m');
  });
});
