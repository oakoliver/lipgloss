import { describe, expect, it } from 'bun:test';
import {
  noBorder, normalBorder, roundedBorder, blockBorder,
  outerHalfBlockBorder, innerHalfBlockBorder, thickBorder,
  doubleBorder, hiddenBorder, markdownBorder, asciiBorder,
  maxRuneWidth, getTopSize, getRightSize, getBottomSize, getLeftSize,
  isNoBorder,
} from '../src/border.js';
import type { Border } from '../src/border.js';

describe('noBorder', () => {
  it('should have all empty strings', () => {
    expect(noBorder.top).toBe('');
    expect(noBorder.bottom).toBe('');
    expect(noBorder.left).toBe('');
    expect(noBorder.right).toBe('');
    expect(noBorder.topLeft).toBe('');
    expect(noBorder.bottomRight).toBe('');
  });
  it('should be identified by isNoBorder', () => {
    expect(isNoBorder(noBorder)).toBe(true);
  });
});

describe('normalBorder', () => {
  it('should have correct box-drawing characters', () => {
    const b = normalBorder();
    expect(b.top).toBe('─');
    expect(b.bottom).toBe('─');
    expect(b.left).toBe('│');
    expect(b.right).toBe('│');
    expect(b.topLeft).toBe('┌');
    expect(b.topRight).toBe('┐');
    expect(b.bottomLeft).toBe('└');
    expect(b.bottomRight).toBe('┘');
  });
  it('should not be noBorder', () => {
    expect(isNoBorder(normalBorder())).toBe(false);
  });
});

describe('roundedBorder', () => {
  it('should have rounded corners', () => {
    const b = roundedBorder();
    expect(b.topLeft).toBe('╭');
    expect(b.topRight).toBe('╮');
    expect(b.bottomLeft).toBe('╰');
    expect(b.bottomRight).toBe('╯');
  });
});

describe('blockBorder', () => {
  it('should use block characters everywhere', () => {
    const b = blockBorder();
    expect(b.top).toBe('█');
    expect(b.left).toBe('█');
    expect(b.topLeft).toBe('█');
  });
});

describe('thickBorder', () => {
  it('should use thick box-drawing characters', () => {
    const b = thickBorder();
    expect(b.top).toBe('━');
    expect(b.left).toBe('┃');
    expect(b.topLeft).toBe('┏');
  });
});

describe('doubleBorder', () => {
  it('should use double-line characters', () => {
    const b = doubleBorder();
    expect(b.top).toBe('═');
    expect(b.left).toBe('║');
    expect(b.topLeft).toBe('╔');
  });
});

describe('hiddenBorder', () => {
  it('should use spaces', () => {
    const b = hiddenBorder();
    expect(b.top).toBe(' ');
    expect(b.left).toBe(' ');
    expect(b.topLeft).toBe(' ');
  });
  it('should not be noBorder (has characters, just spaces)', () => {
    expect(isNoBorder(hiddenBorder())).toBe(false);
  });
});

describe('asciiBorder', () => {
  it('should use ASCII characters', () => {
    const b = asciiBorder();
    expect(b.top).toBe('-');
    expect(b.left).toBe('|');
    expect(b.topLeft).toBe('+');
  });
});

describe('maxRuneWidth', () => {
  it('should return 0 for empty string', () => {
    expect(maxRuneWidth('')).toBe(0);
  });
  it('should return 1 for ASCII', () => {
    expect(maxRuneWidth('-')).toBe(1);
  });
  it('should return 1 for box-drawing', () => {
    expect(maxRuneWidth('─')).toBe(1);
  });
  it('should return max width of multi-char string', () => {
    expect(maxRuneWidth('ab')).toBe(1);
  });
});

describe('getTopSize / getRightSize / getBottomSize / getLeftSize', () => {
  it('should return correct sizes for normal border', () => {
    const b = normalBorder();
    expect(getTopSize(b)).toBe(1);
    expect(getRightSize(b)).toBe(1);
    expect(getBottomSize(b)).toBe(1);
    expect(getLeftSize(b)).toBe(1);
  });
  it('should return 0 for noBorder', () => {
    expect(getTopSize(noBorder)).toBe(0);
    expect(getRightSize(noBorder)).toBe(0);
    expect(getBottomSize(noBorder)).toBe(0);
    expect(getLeftSize(noBorder)).toBe(0);
  });
});

describe('border factories return new instances', () => {
  it('should return distinct objects', () => {
    const a = normalBorder();
    const b = normalBorder();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
