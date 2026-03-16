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
    // Second line should have B and a space (for C's column)
    expect(lines[1]).toContain('B');
  });
  it('should pad shorter blocks when bottom-aligned', () => {
    const result = joinHorizontal(Bottom, 'A\nB', 'C');
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    // C should appear on the second line (bottom aligned)
    expect(lines[1]).toContain('B');
    expect(lines[1]).toContain('C');
  });
  it('should center-align blocks vertically', () => {
    const result = joinHorizontal(Center, 'A\nB\nC', 'X');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    // X should be on the middle line
    expect(lines[1]).toContain('X');
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
    expect(lines[0]).toBe('Hi   '); // padded to width of "World" (5)
    expect(lines[1]).toBe('World');
  });
  it('should right-align', () => {
    const result = joinVertical(Right, 'Hi', 'World');
    const lines = result.split('\n');
    expect(lines[0]).toBe('   Hi'); // right-padded
    expect(lines[1]).toBe('World');
  });
  it('should center-align', () => {
    const result = joinVertical(Center, 'Hi', 'World');
    const lines = result.split('\n');
    // 'Hi' has width 2, 'World' has width 5, gap = 3
    // Center: left = floor(3 * 0.5) = 1, right = 2
    // Wait — the implementation uses Math.round(gap * p) for split,
    // then left = gap - split, right = gap - left
    // split = round(3 * 0.5) = round(1.5) = 2, left = 3 - 2 = 1, right = 3 - 1 = 2
    expect(lines[0].startsWith(' ')).toBe(true);
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
  it('should not add lines if content already fills height', () => {
    const result = placeVertical(1, Top, 'Hi');
    expect(result).toBe('Hi');
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
