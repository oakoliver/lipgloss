import { describe, expect, it } from 'bun:test';
import { joinHorizontal, joinVertical, place, placeHorizontal, placeVertical } from '../src/layout.js';
import { Top, Bottom, Center, Left, Right } from '../src/style.js';

describe('joinHorizontal', () => {
  it('should return empty for no args', () => {
    expect(joinHorizontal(Top)).toBe('');
  });
  it('should return the string unchanged for single arg', () => {
    expect(joinHorizontal(Top, 'Hello')).toBe('Hello');
  });
  it('should join two single-line strings side by side', () => {
    const result = joinHorizontal(Top, 'Hello', 'World');
    expect(result).toBe('HelloWorld');
  });
  it('should pad shorter blocks when top-aligned', () => {
    const result = joinHorizontal(Top, 'A\nB', 'C');
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('A');
    expect(lines[0]).toContain('C');
    expect(lines[1]).toContain('B');
  });
  it('should pad shorter blocks when bottom-aligned', () => {
    const result = joinHorizontal(Bottom, 'A\nB', 'C');
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain('B');
    expect(lines[1]).toContain('C');
  });
  it('should center-align blocks vertically', () => {
    const result = joinHorizontal(Center, 'A\nB\nC', 'X');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain('X');
  });
  // Go parity: fractional position 0.25
  it('should handle fractional position 0.25', () => {
    const result = joinHorizontal(0.25, 'A\nB\nC\nD', 'X');
    const lines = result.split('\n');
    expect(lines.length).toBe(4);
    // extra=3, split=round(3*0.25)=round(0.75)=1, top=3-1=2, bottom=1
    // X appears at row 2 (0-indexed)
    const xLine = lines.findIndex(l => l.includes('X'));
    expect(xLine).toBe(2);
  });
});

describe('joinVertical', () => {
  it('should return empty for no args', () => {
    expect(joinVertical(Left)).toBe('');
  });
  it('should return the string unchanged for single arg', () => {
    expect(joinVertical(Left, 'Hello')).toBe('Hello');
  });
  it('should stack strings vertically, left-aligned', () => {
    const result = joinVertical(Left, 'Hi', 'World');
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toBe('Hi   ');
    expect(lines[1]).toBe('World');
  });
  it('should right-align', () => {
    const result = joinVertical(Right, 'Hi', 'World');
    const lines = result.split('\n');
    expect(lines[0]).toBe('   Hi');
    expect(lines[1]).toBe('World');
  });
  it('should center-align', () => {
    const result = joinVertical(Center, 'Hi', 'World');
    const lines = result.split('\n');
    expect(lines[0].startsWith(' ')).toBe(true);
    expect(lines[0].trim()).toBe('Hi');
  });
  // Go parity: fractional position 0.25
  it('should handle fractional position 0.25', () => {
    const result = joinVertical(0.25, 'Hi', 'World');
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    // gap=3, split=round(3*0.25)=round(0.75)=1, left=3-1=2, right=3-2=1
    // pos=0.25 means "closer to left edge" anchor, so text gets more left-padding
    const leftSpaces = lines[0].length - lines[0].trimStart().length;
    const rightSpaces = lines[0].length - lines[0].trimEnd().length;
    expect(leftSpaces).toBe(2);
    expect(rightSpaces).toBe(1);
    expect(lines[0].trim()).toBe('Hi');
  });
});

describe('placeHorizontal', () => {
  it('should left-align in width', () => {
    const result = placeHorizontal(10, Left, 'Hi');
    expect(result).toBe('Hi        ');
  });
  it('should right-align in width', () => {
    const result = placeHorizontal(10, Right, 'Hi');
    expect(result).toBe('        Hi');
  });
  it('should center in width', () => {
    const result = placeHorizontal(10, Center, 'Hi');
    // gap = 10 - 2 = 8, split = round(8*0.5)=4, left = 8-4=4, right = 8-4=4
    expect(result.length).toBe(10);
    expect(result.trim()).toBe('Hi');
  });
  it('should not truncate if content is wider', () => {
    const result = placeHorizontal(3, Left, 'Hello');
    expect(result).toBe('Hello');
  });
});

describe('placeVertical', () => {
  it('should top-align in height', () => {
    const result = placeVertical(3, Top, 'Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('Hi');
  });
  it('should bottom-align in height', () => {
    const result = placeVertical(3, Bottom, 'Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[2]).toBe('Hi');
  });
  it('should center-align in height', () => {
    const result = placeVertical(5, Center, 'Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(5);
    expect(lines[2]).toBe('Hi');
  });
  it('should not add lines if content already fills height', () => {
    const result = placeVertical(1, Top, 'Hi');
    expect(result).toBe('Hi');
  });
  // Go parity: TestAlignTextVertical cases
  it('single line top in height 3', () => {
    const result = placeVertical(3, Top, 'A');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('A');
    expect(lines[1].trim()).toBe('');
    expect(lines[2].trim()).toBe('');
  });
  it('single line center in height 3', () => {
    const result = placeVertical(3, Center, 'A');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[1]).toBe('A');
  });
  it('single line bottom in height 3', () => {
    const result = placeVertical(3, Bottom, 'A');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[2]).toBe('A');
  });
  it('2 lines top in height 5', () => {
    const result = placeVertical(5, Top, 'A\nB');
    const lines = result.split('\n');
    expect(lines.length).toBe(5);
    expect(lines[0]).toBe('A');
    expect(lines[1]).toBe('B');
  });
  it('2 lines center in height 5', () => {
    const result = placeVertical(5, Center, 'A\nB');
    const lines = result.split('\n');
    expect(lines.length).toBe(5);
    // 2 content, gap=3, center: topPad=round(3*0.5)=2, bottom=1
    expect(lines[1]).toBe('A');
    expect(lines[2]).toBe('B');
  });
  it('2 lines bottom in height 5', () => {
    const result = placeVertical(5, Bottom, 'A\nB');
    const lines = result.split('\n');
    expect(lines.length).toBe(5);
    expect(lines[3]).toBe('A');
    expect(lines[4]).toBe('B');
  });
  it('3 lines in height 3 (exact fit)', () => {
    const result = placeVertical(3, Center, 'A\nB\nC');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('A');
    expect(lines[1]).toBe('B');
    expect(lines[2]).toBe('C');
  });
  it('content larger than height returns content unchanged', () => {
    const result = placeVertical(2, Top, 'A\nB\nC');
    const lines = result.split('\n');
    expect(lines.length).toBe(3); // not truncated
  });
  it('single line center in height 9 (even gap)', () => {
    const result = placeVertical(9, Center, 'X');
    const lines = result.split('\n');
    expect(lines.length).toBe(9);
    // gap=8, topPad=round(8*0.5)=4
    expect(lines[4]).toBe('X');
  });
  it('single line center in height 10 (odd gap)', () => {
    const result = placeVertical(10, Center, 'X');
    const lines = result.split('\n');
    expect(lines.length).toBe(10);
    // gap=9, split=round(9*0.5)=round(4.5)=5, topCount=9-5=4
    // Content 'X' is at index 4
    expect(lines[4]).toBe('X');
  });
});

describe('place (combined)', () => {
  it('should center content in a box', () => {
    const result = place(10, 3, Center, Center, 'Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    // Content should be roughly centered
    const contentLine = lines.find(l => l.includes('Hi'));
    expect(contentLine).toBeDefined();
    expect(contentLine!.trim()).toBe('Hi');
  });
  it('should place at top-left', () => {
    const result = place(10, 3, Left, Top, 'X');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0].startsWith('X')).toBe(true);
  });
});
