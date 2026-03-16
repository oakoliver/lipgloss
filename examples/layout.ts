/**
 * Layout Example — @oakoliver/lipgloss
 *
 * A faithful TypeScript port of the official charmbracelet/lipgloss layout
 * example (examples/layout/main.go). Demonstrates tabs, title with gradient,
 * dialog box, color grid, styled lists, history columns, status bar, and
 * full-page compositing.
 *
 * Run:  bun examples/layout.ts
 *       npx tsx examples/layout.ts
 *       deno run examples/layout.ts
 */

import {
  newStyle,
  joinHorizontal,
  joinVertical,
  place,
  stringWidth,
  normalBorder,
  roundedBorder,
  lightDark,
  isDarkColor,
  parseHex,
  Top,
  Bottom,
  Center,
  Left,
  Right,
  type Color,
  type Border,
} from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const WIDTH = 96;
const COLUMN_WIDTH = 30;

// Detect dark background (heuristic: most terminals are dark)
const hasDarkBG = true;
const ld = lightDark(hasDarkBG);

// ═══════════════════════════════════════════════════════════════════
// Color palette
// ═══════════════════════════════════════════════════════════════════

const subtle: Color    = ld('#D9DCCF', '#383838');
const highlight: Color = ld('#874BFD', '#7D56F4');
const special: Color   = ld('#43BF6D', '#73F59F');

// ═══════════════════════════════════════════════════════════════════
// Reusable styled strings
// ═══════════════════════════════════════════════════════════════════

const divider = newStyle()
  .setString('•')
  .padding(0, 1)
  .foreground(subtle)
  .render();

const url = (s: string) => newStyle().foreground(special).render(s);

// ═══════════════════════════════════════════════════════════════════
// Tabs
// ═══════════════════════════════════════════════════════════════════

const activeTabBorder: Border = {
  top: '─', bottom: ' ', left: '│', right: '│',
  topLeft: '╭', topRight: '╮', bottomLeft: '┘', bottomRight: '└',
  middleLeft: '', middleRight: '', middle: '', middleTop: '', middleBottom: '',
};

const tabBorder: Border = {
  top: '─', bottom: '─', left: '│', right: '│',
  topLeft: '╭', topRight: '╮', bottomLeft: '┴', bottomRight: '┴',
  middleLeft: '', middleRight: '', middle: '', middleTop: '', middleBottom: '',
};

const tab = newStyle()
  .border(tabBorder)
  .borderForeground(highlight)
  .padding(0, 1);

const activeTab = tab.border(activeTabBorder);

const tabGap = tab
  .borderTop(false)
  .borderLeft(false)
  .borderRight(false);

function renderTabs(): string {
  const row = joinHorizontal(
    Top,
    activeTab.render('Lip Gloss'),
    tab.render('Blush'),
    tab.render('Eye Shadow'),
    tab.render('Mascara'),
    tab.render('Foundation'),
  );
  const gap = tabGap.render(' '.repeat(Math.max(0, WIDTH - stringWidth(row) - 2)));
  return joinHorizontal(Bottom, row, gap);
}

// ═══════════════════════════════════════════════════════════════════
// Title with gradient background
// ═══════════════════════════════════════════════════════════════════

const titleStyle = newStyle()
  .marginLeft(1)
  .marginRight(5)
  .padding(0, 1)
  .italic(true)
  .foreground('#FFF7DB')
  .setString('Lip Gloss');

const descStyle = newStyle().marginTop(1);

const infoStyle = newStyle()
  .borderStyle(normalBorder())
  .borderTop(true)
  .borderForeground(subtle);

function colorGrid(xSteps: number, ySteps: number): string[][] {
  // Simple 2D gradient blend from 4 corners:
  //   top-left: #F25D94   top-right: #EDFF82
  //   bot-left: #643AFF   bot-right: #14F9D5
  const corners = {
    tl: parseHex('#F25D94')!, tr: parseHex('#EDFF82')!,
    bl: parseHex('#643AFF')!, br: parseHex('#14F9D5')!,
  };

  const grid: string[][] = [];
  for (let y = 0; y < ySteps; y++) {
    const row: string[] = [];
    const fy = ySteps === 1 ? 0 : y / (ySteps - 1);
    for (let x = 0; x < xSteps; x++) {
      const fx = xSteps === 1 ? 0 : x / (xSteps - 1);
      // Bilinear interpolation
      const r = Math.round(
        corners.tl.r * (1 - fx) * (1 - fy) + corners.tr.r * fx * (1 - fy) +
        corners.bl.r * (1 - fx) * fy + corners.br.r * fx * fy
      );
      const g = Math.round(
        corners.tl.g * (1 - fx) * (1 - fy) + corners.tr.g * fx * (1 - fy) +
        corners.bl.g * (1 - fx) * fy + corners.br.g * fx * fy
      );
      const b = Math.round(
        corners.tl.b * (1 - fx) * (1 - fy) + corners.tr.b * fx * (1 - fy) +
        corners.bl.b * (1 - fx) * fy + corners.br.b * fx * fy
      );
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      row.push(hex);
    }
    grid.push(row);
  }
  return grid;
}

/** Apply a character-by-character foreground gradient. */
function applyGradient(text: string, from: string, to: string): string {
  const chars = [...text]; // grapheme clusters (good enough for ASCII)
  if (chars.length === 0) return '';
  const f = parseHex(from)!;
  const t = parseHex(to)!;
  return chars.map((ch, i) => {
    const p = chars.length === 1 ? 0 : i / (chars.length - 1);
    const r = Math.round(f.r + (t.r - f.r) * p);
    const g = Math.round(f.g + (t.g - f.g) * p);
    const b = Math.round(f.b + (t.b - f.b) * p);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return newStyle().foreground(hex).render(ch);
  }).join('');
}

function renderTitle(): string {
  // Gradient title block: 5 repeated lines with increasing margin
  const colors = colorGrid(1, 5);
  const titleLines: string[] = [];
  for (let i = 0; i < colors.length; i++) {
    titleLines.push(titleStyle.marginLeft(1 + i * 2).background(colors[i][0]).render());
  }
  const titleBlock = titleLines.join('\n');

  const desc = joinVertical(Left,
    descStyle.render('Style Definitions for Nice Terminal Layouts'),
    infoStyle.render('From Charm' + divider + url('https://github.com/charmbracelet/lipgloss')),
  );

  return joinHorizontal(Top, titleBlock, desc);
}

// ═══════════════════════════════════════════════════════════════════
// Dialog
// ═══════════════════════════════════════════════════════════════════

const dialogBoxStyle = newStyle()
  .border(roundedBorder())
  .borderForeground('#874BFD')
  .padding(1, 0)
  .borderTop(true)
  .borderLeft(true)
  .borderRight(true)
  .borderBottom(true);

const buttonStyle = newStyle()
  .foreground('#FFF7DB')
  .background('#888B7E')
  .padding(0, 3)
  .marginTop(1);

const activeButtonStyle = buttonStyle
  .foreground('#FFF7DB')
  .background('#F25D94')
  .marginRight(2)
  .underline(true);

function renderDialog(): string {
  const okButton = activeButtonStyle.render('Yes');
  const cancelButton = buttonStyle.render('Maybe');

  const grad = applyGradient(
    'Are you sure you want to eat marmalade?',
    '#EDFF82',
    '#F25D94',
  );

  const question = newStyle()
    .width(50)
    .align(Center)
    .render(grad);

  const buttons = joinHorizontal(Top, okButton, cancelButton);
  const ui = joinVertical(Center, question, buttons);

  // Place dialog centered in a 96 x 9 region with decorative whitespace
  const dialogBox = dialogBoxStyle.render(ui);

  // Decorate whitespace with subtle cat emoji pattern
  const bgChar = '猫咪';
  const dialogRendered = place(WIDTH, 9, Center, Center, dialogBox);

  // Replace empty spaces in non-dialog lines with decorative chars
  const lines = dialogRendered.split('\n');
  const decorated = lines.map(line => {
    // Only decorate lines that are all/mostly spaces (outside the dialog box)
    if (stringWidth(line.trim()) === 0) {
      // Fill with repeating pattern
      let fill = '';
      while (stringWidth(fill) < WIDTH) fill += bgChar;
      return newStyle().foreground(subtle).render(fill.slice(0, WIDTH));
    }
    return line;
  }).join('\n');

  return decorated;
}

// ═══════════════════════════════════════════════════════════════════
// Lists
// ═══════════════════════════════════════════════════════════════════

const listStyle = newStyle()
  .border(normalBorder(), false, true, false, false)
  .borderForeground(subtle)
  .marginRight(1)
  .height(8)
  .width(Math.floor(WIDTH / 3));

const listHeader = (s: string) =>
  newStyle()
    .borderStyle(normalBorder())
    .borderBottom(true)
    .borderForeground(subtle)
    .marginRight(2)
    .render(s);

const listItem = (s: string) => newStyle().paddingLeft(2).render(s);

const checkMark = newStyle()
  .setString('✓')
  .foreground(special)
  .paddingRight(1)
  .render();

const listDone = (s: string) =>
  checkMark + newStyle()
    .strikethrough(true)
    .foreground(ld('#969B86', '#696969'))
    .render(s);

function renderLists(): string {
  return joinHorizontal(Top,
    listStyle.render(
      joinVertical(Left,
        listHeader('Citrus Fruits to Try'),
        listDone('Grapefruit'),
        listDone('Yuzu'),
        listItem('Citron'),
        listItem('Kumquat'),
        listItem('Pomelo'),
      ),
    ),
    listStyle.render(
      joinVertical(Left,
        listHeader('Actual Lip Gloss Vendors'),
        listItem('Glossier'),
        listItem("Claire's Boutique"),
        listDone('Nyx'),
        listItem('Mac'),
        listDone('Milk'),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════════════
// Color Grid
// ═══════════════════════════════════════════════════════════════════

function renderColorGrid(): string {
  const grid = colorGrid(14, 8);
  const lines: string[] = [];
  for (const row of grid) {
    let line = '';
    for (const hex of row) {
      line += newStyle().setString('  ').background(hex).render();
    }
    lines.push(line);
  }
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// History (paragraph columns)
// ═══════════════════════════════════════════════════════════════════

const historyStyle = newStyle()
  .align(Left)
  .foreground('#FAFAFA')
  .background(highlight)
  .margin(1, 3, 0, 0)
  .padding(1, 2)
  .height(19)
  .width(COLUMN_WIDTH);

const historyA = "The Romans learned from the Greeks that quinces slowly cooked with honey would \u201Cset\u201D when cool. The Apicius gives a recipe for preserving whole quinces, stems and leaves attached, in a bath of honey diluted with defrutum: Roman marmalade. Preserves of quince and lemon appear (along with rose, apple, plum and pear) in the Book of ceremonies of the Byzantine Emperor Constantine VII Porphyrogennetos.";
const historyB = "Medieval quince preserves, which went by the French name cotignac, produced in a clear version and a fruit pulp version, began to lose their medieval seasoning of spices in the 16th century. In the 17th century, La Varenne provided recipes for both thick and clear cotignac.";
const historyC = "In 1524, Henry VIII, King of England, received a \u201Cbox of marmalade\u201D from Mr. Hull of Exeter. This was probably marmelada, a solid quince paste from Portugal, still made and sold in southern Europe today. It became a favourite treat of Anne Boleyn and her ladies in waiting.";

function renderHistory(): string {
  return joinHorizontal(Top,
    historyStyle.align(Right).render(historyA),
    historyStyle.align(Center).render(historyB),
    historyStyle.marginRight(0).render(historyC),
  );
}

// ═══════════════════════════════════════════════════════════════════
// Status Bar
// ═══════════════════════════════════════════════════════════════════

const statusNugget = newStyle()
  .foreground('#FFFDF5')
  .padding(0, 1);

const statusBarStyle = newStyle()
  .foreground(ld('#343433', '#C1C6B2'))
  .background(ld('#D9DCCF', '#353533'));

const statusStyleS = newStyle()
  .inherit(statusBarStyle)
  .foreground('#FFFDF5')
  .background('#FF5F87')
  .padding(0, 1)
  .marginRight(1);

const encodingStyle = statusNugget
  .background('#A550DF')
  .align(Right);

const statusText = newStyle().inherit(statusBarStyle);

const fishCakeStyle = statusNugget.background('#6124DF');

function renderStatusBar(): string {
  const w = stringWidth;

  const lightDarkState = hasDarkBG ? 'Dark' : 'Light';

  const statusKey = statusStyleS.render('STATUS');
  const encoding = encodingStyle.render('UTF-8');
  const fishCake = fishCakeStyle.render('🍥 Fish Cake');
  const statusVal = statusText
    .width(WIDTH - w(statusKey) - w(encoding) - w(fishCake))
    .render('Ravishingly ' + lightDarkState + '!');

  const bar = joinHorizontal(Top,
    statusKey,
    statusVal,
    encoding,
    fishCake,
  );

  return statusBarStyle.width(WIDTH).render(bar);
}

// ═══════════════════════════════════════════════════════════════════
// Compose the full document
// ═══════════════════════════════════════════════════════════════════

const docStyle = newStyle().padding(1, 2, 1, 2);

function render(): string {
  const parts: string[] = [];

  // Tabs
  parts.push(renderTabs());
  parts.push('');

  // Title
  parts.push(renderTitle());
  parts.push('');

  // Dialog
  parts.push(renderDialog());
  parts.push('');

  // Lists + Color grid side-by-side
  const lists = renderLists();
  const colors = newStyle().marginLeft(1).render(renderColorGrid());
  parts.push(joinHorizontal(Top, lists, colors));

  // History
  parts.push(renderHistory());
  parts.push('');

  // Status bar
  parts.push(renderStatusBar());

  const doc = parts.join('\n');

  // Apply document padding, capped at terminal width
  let termWidth = 0;
  try {
    termWidth = process.stdout.columns || 0;
  } catch {
    termWidth = 0;
  }

  let style = docStyle;
  if (termWidth > 0) {
    style = style.maxWidth(termWidth);
  }

  return style.render(doc);
}

// ═══════════════════════════════════════════════════════════════════
// Run
// ═══════════════════════════════════════════════════════════════════

console.log(render());
