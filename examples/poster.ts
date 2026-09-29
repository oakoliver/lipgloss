/**
 * Poster — @oakoliver/lipgloss
 *
 * A one-screen tour: a block-letter banner coloured with a rotated 2D CIELAB
 * gradient (blend2D), a border gallery (rounded with borderForegroundBlend,
 * thick, double with per-side colours, outer half-block with background), a
 * dialog place()d on a patterned whitespace field, and overlapping windows
 * composited over a gradient with newCompositor(). All content is made up;
 * the version badge comes from package.json.
 *
 * Run:  bun examples/poster.ts             (best at 124 columns, truecolor)
 *       bun examples/poster.ts --goldens   (adds a badge scoring this checkout
 *                                           against the upstream Go goldens in
 *                                           tests/fixtures: wrap + OSC 8 links)
 */
import {
  newStyle, joinHorizontal, joinVertical, place, withWhitespaceChars, withWhitespaceStyle,
  roundedBorder, thickBorder, doubleBorder, outerHalfBlockBorder,
  blend1D, blend2D, darken, newLayer, newCompositor, wrap, width,
  Top, Center, Left, Right,
  newRange, newWrapWriter, normalBorder, resetHyperlink, setHyperlink, styleRanges, truncate,
  type Color,
} from '../src/index.js';
import goldens from '../tests/fixtures/wrap-whitespace-v2.0.6.json';
import linkGoldens from '../tests/fixtures/hyperlink-v2.0.6.json';
import pkg from '../package.json';

const W = 120;
const PINK = '#F25D94', VIOLET = '#7D56F4', CYAN = '#14F9D5', AMBER = '#FFB86C', SKY = '#5FAFFF';
const FG = '#E6E6F0', DIM = '#6C6F85', BG = '#1E1E2E';

// ── optional: live parity tally against the upstream Go goldens ──────────
// Only with --goldens. It scores this checkout against the Go-generated
// fixtures in tests/fixtures; the default run uses no repository data.
const SHOW_GOLDENS = process.argv.slice(2).includes('--goldens');
function goldenTally(): { pass: number; total: number } {
  let pass = 0;
  for (const c of goldens as any[]) {
    let out: string;
    if (c.kind === 'wrap') out = wrap(c.in, c.w, '');
    else {
      let s = newStyle().width(c.w);
      if (c.opt === 'pad') s = s.padding(0, 1);
      if (c.opt === 'center') s = s.align(Center);
      if (c.opt === 'right') s = s.align(Right);
      if (c.opt === 'tab2') s = s.tabWidth(2);
      if (c.opt === 'tabkeep') s = s.tabWidth(-1);
      out = s.render(c.in);
    }
    if (out === c.out) pass++;
  }
  // OSC 8 hyperlink goldens: same dispatch as tests/hyperlink.test.ts
  const dec = new TextDecoder(), enc = new TextEncoder();
  function runLink(c: any): string {
    const base = () => newStyle().hyperlink('https://example.com');
    switch (c.kind) {
      case 'wrap': return wrap(c.in, c.n, '');
      case 'style': return c.opt === 'width' ? newStyle().width(c.n).render(c.in) : newStyle().maxWidth(c.n).render(c.in);
      case 'truncate': return truncate(c.in, c.n);
      case 'writer': {
        let out = '';
        const w = newWrapWriter({ write: (ch: any) => { out += typeof ch === 'string' ? ch : dec.decode(ch); } });
        if (c.opt === 'whole') w.write(c.in);
        else { const b = enc.encode(c.in); for (let k = 0; k < b.length; k += c.n) w.write(b.slice(k, k + c.n)); }
        w.close(); return out;
      }
      case 'ranges': return styleRanges(c.in, newRange(2, 6, newStyle().bold(true)));
      case 'canvas': return newCompositor(newLayer(c.in)).render();
      case 'hyperlink': switch (c.opt) {
        case 'plain': return base().render(c.in);
        case 'params': return newStyle().hyperlink('https://example.com', 'id=1').render(c.in);
        case 'width': return base().width(c.n).render(c.in);
        case 'bold-width': return newStyle().hyperlink('https://example.com', 'id=1').bold(true).width(c.n).render(c.in);
        case 'pad-center': return base().width(c.n).padding(0, 1).align(Center).render(c.in);
        case 'maxwidth': return base().maxWidth(c.n).render(c.in);
        case 'border-maxwidth': return base().border(normalBorder()).width(c.n + 2).maxWidth(c.n).render(c.in);
        case 'canvas': return newCompositor(newLayer(base().render(c.in))).render();
      } break;
      case 'sethyperlink': return c.opt ? setHyperlink(c.in, c.opt) : setHyperlink(c.in);
      case 'resethyperlink': return resetHyperlink();
    }
    return '<unknown>';
  }
  for (const c of linkGoldens as any[]) if (runLink(c) === c.out) pass++;
  const total = (goldens as any[]).length + (linkGoldens as any[]).length;
  return { pass, total };
}

// ── block-letter banner with a rotated 2D CIELAB gradient ─────────────────
const FONT: Record<string, string[]> = {
  L: ['██╗     ', '██║     ', '██║     ', '██║     ', '███████╗', '╚══════╝'],
  I: ['██╗', '██║', '██║', '██║', '██║', '╚═╝'],
  P: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔═══╝ ', '██║     ', '╚═╝     '],
  G: [' ██████╗ ', '██╔════╝ ', '██║  ███╗', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  O: [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  S: ['███████╗', '██╔════╝', '███████╗', '╚════██║', '███████║', '╚══════╝'],
  ' ': ['  ', '  ', '  ', '  ', '  ', '  '],
};
function banner(word: string): string {
  const rows = FONT.L.map((_, r) => [...word].map(ch => FONT[ch][r]).join(''));
  const bw = [...rows[0]].length, bh = rows.length;
  const grad = blend2D(bw, bh, 20, PINK, VIOLET, SKY, CYAN);
  return rows.map((row, y) => [...row].map((ch, x) => {
    const c = grad[y * bw + x];
    if (ch === '█') return newStyle().foreground(c).render(ch);
    if (ch === ' ') return ' ';
    return newStyle().foreground(darken(c, 0.4)).render(ch); // the "shadow" strokes
  }).join('')).join('\n');
}

function gradientText(s: string, ...stops: Color[]): string {
  const cs = blend1D([...s].length, ...stops);
  return [...s].map((ch, i) => newStyle().foreground(cs[i]).bold(true).render(ch)).join('');
}
const pill = (label: string, bg: Color, fg: Color = BG) =>
  newStyle().background(bg).foreground(fg).bold(true).padding(0, 1).render(label);

const title = banner('LIPGLOSS');
const tagline = gradientText('Style definitions for nice terminal layouts, now in TypeScript', AMBER, PINK, VIOLET);
const pills = [
  pill(`@oakoliver/lipgloss ${pkg.version}`, PINK),
  pill('CSS-like styling', VIOLET, FG),
  ...(SHOW_GOLDENS ? [(({ pass, total }) => pill(`${pass}/${total} Go goldens`, CYAN))(goldenTally())] : []),
  pill('zero deps', '#3B3F5C', FG),
].join(' ');
const header = place(W, 11, Center, Center,
  joinVertical(Center, title, '', tagline, '', pills));

// ── border gallery ────────────────────────────────────────────────────────
const cardW = 26;
const label = (name: string, sub: string, c: Color, bg?: Color) => joinVertical(Center,
  newStyle().foreground(c).bold(true).background(bg).render(name),
  newStyle().foreground(bg ? '#B08BB5' : DIM).background(bg).render(sub));
const cards = [
  newStyle().border(roundedBorder()).borderForegroundBlend(PINK, AMBER, CYAN, VIOLET)
    .width(cardW).height(3).align(Center, Center).render(label('roundedBorder()', 'borderForegroundBlend', PINK)),
  newStyle().border(thickBorder()).borderForeground(VIOLET)
    .width(cardW).height(3).align(Center, Center).render(label('thickBorder()', 'borderForeground', '#B39DFF')),
  newStyle().border(doubleBorder()).borderForeground(CYAN, AMBER)
    .width(cardW).height(3).align(Center, Center).render(label('doubleBorder()', 'per-side colors', CYAN)),
  newStyle().border(outerHalfBlockBorder()).borderForeground('#FF6AC1').borderBackground('#3A1F3D').background('#3A1F3D')
    .width(cardW).height(3).align(Center, Center).render(label('outerHalfBlock()', 'with background', '#FF9BD2', '#3A1F3D')),
];
const gallery = place(W, 5, Center, Top, joinHorizontal(Top, ...cards.flatMap((c, i) => i ? ['  ', c] : [c])));

// ── left: place() a dialog in a patterned whitespace field ────────────────
const PW = 58, PH = 13;
const dialog = newStyle().border(roundedBorder()).borderForegroundBlend(VIOLET, PINK).padding(1, 3)
  .render(joinVertical(Center,
    newStyle().foreground(FG).bold(true).render('Deploy tidepool to production?'),
    newStyle().foreground(DIM).render('v3.1.4  ->  v3.2.0, 3 migrations'),
    '',
    joinHorizontal(Top,
      newStyle().background(PINK).foreground(BG).bold(true).padding(0, 3).render('Deploy'),
      '  ',
      newStyle().background('#44475A').foreground(FG).padding(0, 2).render('Cancel'))));
const field = place(PW, PH, Center, Center, dialog,
  withWhitespaceChars('╱ '),
  withWhitespaceStyle(newStyle().foreground('#3D3553')));
const leftCap = newStyle().foreground(DIM).italic(true).render('place() + withWhitespaceChars("╱ ")');

// ── right: blend2D aurora with composited, overlapping layers ─────────────
const aur = blend2D(PW, PH, 35, '#0F0C29', '#302B63', '#7D56F4', '#F25D94', '#FFB86C');
const aurora = Array.from({ length: PH }, (_, y) =>
  Array.from({ length: PW }, (_, x) => newStyle().background(aur[y * PW + x]).render(' ')).join('')).join('\n');
const WIN = '#16161E';
const win = (t: string, body: string, c: Color, w: number) =>
  newStyle().border(roundedBorder()).borderForeground(c).borderBackground(WIN).background(WIN).foreground(FG)
    .padding(0, 1).width(w).render(joinVertical(Left, newStyle().foreground(c).background(WIN).bold(true).width(w - 2).render(t), body));
const shadowOf = (s: string) => newStyle().background('#07070D').render(
  s.split('\n').map(() => ' '.repeat(width(s))).join('\n'));
const w1 = win('layer z=1', newStyle().foreground(DIM).background(WIN).width(28).render('newLayer(card).x(4).y(2)'), CYAN, 30);
const w2 = win('layer z=2', newStyle().foreground(DIM).background(WIN).width(28).render('Compositor sorts by z,\nclips, and flattens ANSI.'), AMBER, 30);
const comp = newCompositor(
  newLayer(aurora).z(0),
  newLayer(shadowOf(w1)).x(6).y(3).z(1),
  newLayer(w1).x(4).y(2).z(2),
  newLayer(shadowOf(w2)).x(25).y(7).z(3),
  newLayer(w2).x(23).y(6).z(4),
);
const rightCap = newStyle().foreground(DIM).italic(true).render('blend2D(58, 13, 35deg) + newCompositor(...layers)');

const bottom = joinHorizontal(Top,
  joinVertical(Left, field, leftCap), '    ',
  joinVertical(Left, comp.render(), rightCap));

// ── gradient rule and footer ──────────────────────────────────────────────
const rule = blend1D(W, '#2A2A3A', VIOLET, PINK, '#2A2A3A')
  .map(c => newStyle().foreground(c).render('━')).join('');

process.stdout.write('\n' + joinVertical(Left, header, '', gallery, '', rule, '', place(W, PH + 1, Center, Top, bottom)) + '\n');
