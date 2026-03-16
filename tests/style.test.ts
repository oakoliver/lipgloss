import { describe, expect, it } from 'bun:test';
import { Style, newStyle, getLines, Top, Bottom, Center, Left, Right } from '../src/style.js';
import { normalBorder, roundedBorder, noBorder, doubleBorder, hiddenBorder } from '../src/border.js';
import { stripAnsi, stringWidth } from '../src/ansi.js';
import { NO_COLOR } from '../src/color.js';

// Helper: strip ANSI and get visible content
function visible(s: string): string {
  return stripAnsi(s);
}

describe('newStyle', () => {
  it('should create an empty Style', () => {
    const s = newStyle();
    expect(s).toBeInstanceOf(Style);
  });
  it('should render plain text unchanged', () => {
    const s = newStyle();
    expect(s.render('Hello')).toBe('Hello');
  });
});

describe('getLines', () => {
  it('should split by newlines and find widest', () => {
    const { lines, widest } = getLines('Hi\nWorld');
    expect(lines).toEqual(['Hi', 'World']);
    expect(widest).toBe(5);
  });
  it('should handle single line', () => {
    const { lines, widest } = getLines('Hello');
    expect(lines).toEqual(['Hello']);
    expect(widest).toBe(5);
  });
  it('should convert tabs to 4 spaces', () => {
    const { lines } = getLines('A\tB');
    expect(lines[0]).toBe('A    B');
  });
  it('should normalize CRLF to LF', () => {
    const { lines } = getLines('A\r\nB');
    expect(lines).toEqual(['A', 'B']);
  });
});

describe('Style immutability', () => {
  it('should not mutate original when setting property', () => {
    const a = newStyle();
    const b = a.bold(true);
    expect(a.getBold()).toBe(false);
    expect(b.getBold()).toBe(true);
  });
  it('should chain setters producing distinct instances', () => {
    const a = newStyle().bold(true).italic(true);
    const b = a.bold(false);
    expect(a.getBold()).toBe(true);
    expect(a.getItalic()).toBe(true);
    expect(b.getBold()).toBe(false);
    expect(b.getItalic()).toBe(true);
  });
});

describe('Style boolean setters/getters', () => {
  it('bold', () => {
    const s = newStyle().bold(true);
    expect(s.getBold()).toBe(true);
  });
  it('italic', () => {
    const s = newStyle().italic(true);
    expect(s.getItalic()).toBe(true);
  });
  it('strikethrough', () => {
    const s = newStyle().strikethrough(true);
    expect(s.getStrikethrough()).toBe(true);
  });
  it('reverse', () => {
    const s = newStyle().reverse(true);
    expect(s.getReverse()).toBe(true);
  });
  it('blink', () => {
    const s = newStyle().blink(true);
    expect(s.getBlink()).toBe(true);
  });
  it('faint', () => {
    const s = newStyle().faint(true);
    expect(s.getFaint()).toBe(true);
  });
  it('inline', () => {
    const s = newStyle().inline(true);
    expect(s.getInline()).toBe(true);
  });
});

describe('Style underline', () => {
  it('underline(true) sets single underline', () => {
    const s = newStyle().underline(true);
    expect(s.getUnderline()).toBe(true);
    expect(s.getUnderlineStyle()).toBe('single');
  });
  it('underline(false) sets no underline', () => {
    const s = newStyle().underline(false);
    expect(s.getUnderline()).toBe(false);
    expect(s.getUnderlineStyle()).toBe('none');
  });
  it('underlineStyle sets specific style', () => {
    const s = newStyle().underlineStyle('curly');
    expect(s.getUnderlineStyle()).toBe('curly');
    expect(s.getUnderline()).toBe(true);
  });
});

describe('Style colors', () => {
  it('foreground', () => {
    const s = newStyle().foreground('#ff0000');
    expect(s.getForeground()).toBe('#ff0000');
  });
  it('background', () => {
    const s = newStyle().background(196);
    expect(s.getBackground()).toBe(196);
  });
  it('underlineColor', () => {
    const s = newStyle().underlineColor('#00ff00');
    expect(s.getUnderlineColor()).toBe('#00ff00');
  });
  it('unset colors return null', () => {
    const s = newStyle();
    expect(s.getForeground()).toBeNull();
    expect(s.getBackground()).toBeNull();
    expect(s.getUnderlineColor()).toBeNull();
  });
});

describe('Style dimensions', () => {
  it('width/height', () => {
    const s = newStyle().width(20).height(5);
    expect(s.getWidth()).toBe(20);
    expect(s.getHeight()).toBe(5);
  });
  it('maxWidth/maxHeight', () => {
    const s = newStyle().maxWidth(80).maxHeight(24);
    expect(s.getMaxWidth()).toBe(80);
    expect(s.getMaxHeight()).toBe(24);
  });
  it('defaults to 0 when unset', () => {
    const s = newStyle();
    expect(s.getWidth()).toBe(0);
    expect(s.getHeight()).toBe(0);
    expect(s.getMaxWidth()).toBe(0);
    expect(s.getMaxHeight()).toBe(0);
  });
  it('clamps negative values to 0', () => {
    const s = newStyle().width(-5).height(-1);
    expect(s.getWidth()).toBe(0);
    expect(s.getHeight()).toBe(0);
  });
});

describe('Style alignment', () => {
  it('align with 2 values', () => {
    const s = newStyle().align(Center, Bottom);
    expect(s.getAlignHorizontal()).toBe(Center);
    expect(s.getAlignVertical()).toBe(Bottom);
  });
  it('align with 1 value', () => {
    const s = newStyle().align(Right);
    expect(s.getAlignHorizontal()).toBe(Right);
  });
  it('individual setters', () => {
    const s = newStyle().alignHorizontal(Center).alignVertical(Top);
    expect(s.getAlignHorizontal()).toBe(Center);
    expect(s.getAlignVertical()).toBe(Top);
  });
});

describe('Style padding', () => {
  it('padding with 1 arg (all sides)', () => {
    const s = newStyle().padding(2);
    expect(s.getPadding()).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
  });
  it('padding with 2 args (vert, horiz)', () => {
    const s = newStyle().padding(1, 3);
    expect(s.getPadding()).toEqual({ top: 1, right: 3, bottom: 1, left: 3 });
  });
  it('padding with 4 args (top, right, bottom, left)', () => {
    const s = newStyle().padding(1, 2, 3, 4);
    expect(s.getPadding()).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
  });
  it('individual padding setters', () => {
    const s = newStyle().paddingTop(1).paddingRight(2).paddingBottom(3).paddingLeft(4);
    expect(s.getPaddingTop()).toBe(1);
    expect(s.getPaddingRight()).toBe(2);
    expect(s.getPaddingBottom()).toBe(3);
    expect(s.getPaddingLeft()).toBe(4);
  });
  it('getHorizontalPadding / getVerticalPadding', () => {
    const s = newStyle().padding(1, 2, 3, 4);
    expect(s.getHorizontalPadding()).toBe(6); // 2 + 4
    expect(s.getVerticalPadding()).toBe(4); // 1 + 3
  });
});

describe('Style margin', () => {
  it('margin with CSS shorthand', () => {
    const s = newStyle().margin(1, 2);
    expect(s.getMargin()).toEqual({ top: 1, right: 2, bottom: 1, left: 2 });
  });
  it('marginBackground', () => {
    const s = newStyle().marginBackground('#ff0000');
    const rendered = s.margin(0, 1).render('Hi');
    // Should have margin content
    expect(rendered).toBeDefined();
  });
  it('getHorizontalMargins / getVerticalMargins', () => {
    const s = newStyle().margin(1, 2, 3, 4);
    expect(s.getHorizontalMargins()).toBe(6); // 2 + 4
    expect(s.getVerticalMargins()).toBe(4); // 1 + 3
  });
});

describe('Style border', () => {
  it('border(normalBorder()) enables all sides', () => {
    const s = newStyle().border(normalBorder());
    expect(s.getBorderTop()).toBe(true);
    expect(s.getBorderRight()).toBe(true);
    expect(s.getBorderBottom()).toBe(true);
    expect(s.getBorderLeft()).toBe(true);
  });
  it('border with side selection', () => {
    const s = newStyle().border(normalBorder(), true, false, true, false);
    expect(s.getBorderTop()).toBe(true);
    expect(s.getBorderRight()).toBe(false);
    expect(s.getBorderBottom()).toBe(true);
    expect(s.getBorderLeft()).toBe(false);
  });
  it('borderStyle sets just the style', () => {
    const s = newStyle().borderStyle(roundedBorder());
    expect(s.getBorderStyle()).toEqual(roundedBorder());
  });
  it('borderForeground CSS shorthand', () => {
    const s = newStyle().borderForeground('#ff0000', '#00ff00');
    // 2-arg: top=bottom=#ff0000, right=left=#00ff00
  });
  it('border size calculations', () => {
    const s = newStyle().border(normalBorder());
    expect(s.getBorderTopSize()).toBe(1);
    expect(s.getBorderRightSize()).toBe(1);
    expect(s.getBorderBottomSize()).toBe(1);
    expect(s.getBorderLeftSize()).toBe(1);
    expect(s.getHorizontalBorderSize()).toBe(2);
    expect(s.getVerticalBorderSize()).toBe(2);
  });
  it('noBorder returns 0 sizes', () => {
    const s = newStyle().border(noBorder);
    expect(s.getBorderTopSize()).toBe(0);
  });
});

describe('Style frame size', () => {
  it('should include padding + border + margin', () => {
    const s = newStyle()
      .padding(1, 2)
      .margin(0, 1)
      .border(normalBorder());
    const frame = s.getFrameSize();
    // horizontal: marginL(1) + borderL(1) + padL(2) + padR(2) + borderR(1) + marginR(1) = 8
    // vertical: marginT(0) + borderT(1) + padT(1) + padB(1) + borderB(1) + marginB(0) = 4
    expect(frame.x).toBe(8);
    expect(frame.y).toBe(4);
  });
});

describe('Style render - bold', () => {
  it('should wrap text in bold ANSI', () => {
    const result = newStyle().bold(true).render('Hello');
    expect(result).toContain('\x1b[1m');
    expect(result).toContain('Hello');
    expect(result).toContain('\x1b[0m');
  });
});

describe('Style render - foreground color', () => {
  it('should apply RGB foreground from hex', () => {
    const result = newStyle().foreground('#ff0000').render('Red');
    expect(result).toContain('\x1b[38;2;255;0;0m');
    expect(visible(result)).toBe('Red');
  });
  it('should apply ANSI 256 color', () => {
    const result = newStyle().foreground(196).render('Red');
    expect(result).toContain('\x1b[38;5;');
  });
  it('should apply basic ANSI color', () => {
    const result = newStyle().foreground(1).render('Red');
    expect(result).toContain('\x1b[31m'); // basic red = 30 + 1
  });
});

describe('Style render - background color', () => {
  it('should apply background', () => {
    const result = newStyle().background('#0000ff').render('Blue');
    expect(result).toContain('\x1b[48;2;0;0;255m');
  });
});

describe('Style render - width', () => {
  it('should pad to width', () => {
    const result = newStyle().width(10).render('Hi');
    const vis = visible(result);
    expect(stringWidth(vis)).toBe(10);
  });
  it('should word-wrap at width minus padding', () => {
    const result = newStyle().width(10).padding(0, 1).render('Hello World');
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });
});

describe('Style render - height', () => {
  it('should pad to height', () => {
    const result = newStyle().height(3).render('Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
  });
});

describe('Style render - maxWidth', () => {
  it('should truncate lines exceeding maxWidth', () => {
    const result = newStyle().maxWidth(5).render('Hello World');
    const vis = visible(result);
    expect(stringWidth(vis)).toBeLessThanOrEqual(5);
  });
});

describe('Style render - maxHeight', () => {
  it('should truncate lines exceeding maxHeight', () => {
    const result = newStyle().maxHeight(2).render('Line1\nLine2\nLine3\nLine4');
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
  });
});

describe('Style render - padding', () => {
  it('should add left padding', () => {
    const result = newStyle().paddingLeft(2).render('Hi');
    const vis = visible(result);
    expect(vis.startsWith('  Hi')).toBe(true);
  });
  it('should add right padding', () => {
    const result = newStyle().paddingRight(2).render('Hi');
    const vis = visible(result);
    expect(vis.endsWith('Hi  ')).toBe(true);
  });
  it('should add top padding', () => {
    const result = newStyle().paddingTop(1).render('Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    // Top padding line gets equalized to content width (spaces)
    expect(visible(lines[0]).trim()).toBe('');
    expect(visible(lines[1])).toBe('Hi');
  });
  it('should add bottom padding', () => {
    const result = newStyle().paddingBottom(1).render('Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    expect(visible(lines[0])).toBe('Hi');
    // Bottom padding line gets equalized to content width (spaces)
    expect(visible(lines[1]).trim()).toBe('');
  });
});

describe('Style render - borders', () => {
  it('should render with normal border on all sides', () => {
    const result = newStyle().border(normalBorder()).render('Hi');
    const lines = result.split('\n');
    // top border, content, bottom border
    expect(lines.length).toBe(3);
    expect(visible(lines[0])).toContain('┌');
    expect(visible(lines[0])).toContain('─');
    expect(visible(lines[0])).toContain('┐');
    expect(visible(lines[1])).toContain('│');
    expect(visible(lines[1])).toContain('Hi');
    expect(visible(lines[2])).toContain('└');
    expect(visible(lines[2])).toContain('┘');
  });
  it('should render with rounded border', () => {
    const result = newStyle().border(roundedBorder()).render('X');
    const vis = visible(result);
    expect(vis).toContain('╭');
    expect(vis).toContain('╯');
  });
  it('should render with only top/bottom borders', () => {
    const result = newStyle().border(normalBorder(), true, false, true, false).render('Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    // No side borders — top and bottom shouldn't have corners
    expect(visible(lines[1])).toBe('Hi');
  });
  it('should render with only left/right borders', () => {
    const result = newStyle().border(normalBorder(), false, true, false, true).render('Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(1);
    expect(visible(lines[0])).toContain('│');
    expect(visible(lines[0])).toContain('Hi');
  });
  it('should render double border', () => {
    const result = newStyle().border(doubleBorder()).render('X');
    const vis = visible(result);
    expect(vis).toContain('╔');
    expect(vis).toContain('═');
    expect(vis).toContain('║');
  });
  it('should color borders with borderForeground', () => {
    const result = newStyle()
      .border(normalBorder())
      .borderForeground('#ff0000')
      .render('Hi');
    // Should contain ANSI color codes around border chars
    expect(result).toContain('\x1b[38;2;255;0;0m');
  });
});

describe('Style render - margins', () => {
  it('should add left margin', () => {
    const result = newStyle().marginLeft(2).render('Hi');
    const vis = visible(result);
    expect(vis).toBe('  Hi');
  });
  it('should add right margin', () => {
    const result = newStyle().marginRight(2).render('Hi');
    const vis = visible(result);
    expect(vis).toBe('Hi  ');
  });
  it('should add top margin', () => {
    const result = newStyle().marginTop(1).render('Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    expect(visible(lines[1])).toBe('Hi');
  });
  it('should add bottom margin', () => {
    const result = newStyle().marginBottom(1).render('Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    expect(visible(lines[0])).toBe('Hi');
  });
});

describe('Style render - inline mode', () => {
  it('should strip newlines', () => {
    const result = newStyle().inline(true).render('Hello\nWorld');
    expect(result).not.toContain('\n');
    expect(visible(result)).toBe('HelloWorld');
  });
});

describe('Style render - tabWidth', () => {
  it('should convert tabs to specified width', () => {
    const result = newStyle().tabWidth(2).render('A\tB');
    expect(visible(result)).toBe('A  B');
  });
  it('should remove tabs when tabWidth is 0', () => {
    const result = newStyle().tabWidth(0).render('A\tB');
    expect(visible(result)).toBe('AB');
  });
  it('should leave tabs when tabWidth is -1', () => {
    const result = newStyle().tabWidth(-1).render('A\tB');
    expect(visible(result)).toBe('A\tB');
  });
  it('default tabWidth is 4', () => {
    expect(newStyle().getTabWidth()).toBe(4);
    const result = newStyle().render('A\tB');
    expect(visible(result)).toBe('A    B');
  });
});

describe('Style render - transform', () => {
  it('should apply transform function', () => {
    const result = newStyle().transform(s => s.toUpperCase()).render('hello');
    expect(visible(result)).toBe('HELLO');
  });
});

describe('Style setString', () => {
  it('should prepend value when rendering', () => {
    const s = newStyle().setString('Prefix:');
    expect(visible(s.render('Test'))).toBe('Prefix: Test');
  });
  it('should render value alone when no args', () => {
    const s = newStyle().setString('Hello');
    expect(visible(s.render())).toBe('Hello');
  });
});

describe('Style toString', () => {
  it('should render the value', () => {
    const s = newStyle().setString('World').bold(true);
    expect(stripAnsi(s.toString())).toBe('World');
  });
});

describe('Style hyperlink', () => {
  it('should wrap content in hyperlink escapes', () => {
    const result = newStyle().hyperlink('https://example.com').render('Click');
    expect(result).toContain('\x1b]8;');
    expect(result).toContain('https://example.com');
    expect(result).toContain('\x1b]8;;\x1b\\');
  });
});

describe('Style inherit', () => {
  it('should inherit unset properties from other', () => {
    const parent = newStyle().bold(true).foreground('#ff0000');
    const child = newStyle().italic(true);
    const merged = child.inherit(parent);
    expect(merged.getBold()).toBe(true);
    expect(merged.getItalic()).toBe(true);
    expect(merged.getForeground()).toBe('#ff0000');
  });
  it('should not override already-set properties', () => {
    const parent = newStyle().bold(true).foreground('#ff0000');
    const child = newStyle().foreground('#00ff00');
    const merged = child.inherit(parent);
    expect(merged.getForeground()).toBe('#00ff00');
    expect(merged.getBold()).toBe(true);
  });
  it('should not inherit padding/margin', () => {
    const parent = newStyle().padding(5).margin(3);
    const child = newStyle();
    const merged = child.inherit(parent);
    expect(merged.getPaddingTop()).toBe(0);
    expect(merged.getMarginTop()).toBe(0);
  });
});

describe('Style render - complex combinations', () => {
  it('bold + foreground + padding + border', () => {
    const result = newStyle()
      .bold(true)
      .foreground('#ff0000')
      .padding(0, 1)
      .border(roundedBorder())
      .render('Hi');
    const lines = result.split('\n');
    // Should have 3 lines: top border, content with padding and sides, bottom border
    expect(lines.length).toBe(3);
    const visMiddle = visible(lines[1]);
    expect(visMiddle).toContain('│');
    expect(visMiddle).toContain('Hi');
    // Should have ANSI codes for bold and color
    expect(result).toContain('\x1b[1m');
    expect(result).toContain('\x1b[38;2;255;0;0m');
  });
  it('width + height + center alignment', () => {
    const result = newStyle()
      .width(20)
      .height(3)
      .align(Center, Center)
      .render('Hi');
    const lines = result.split('\n');
    expect(lines.length).toBe(3);
    // Content line should be roughly centered
    const contentLine = lines.find(l => visible(l).includes('Hi'));
    expect(contentLine).toBeDefined();
    expect(stringWidth(visible(contentLine!))).toBe(20);
  });
  it('multiline content with border', () => {
    const result = newStyle()
      .border(normalBorder())
      .render('Line1\nLine2');
    const lines = result.split('\n');
    // top border + 2 content lines + bottom border = 4
    expect(lines.length).toBe(4);
  });
});
