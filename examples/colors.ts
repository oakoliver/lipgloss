/**
 * Colors Example — @oakoliver/lipgloss
 *
 * The 16 ANSI colors, the 256-color palette, true-color blends, and the
 * color utilities (darken, lighten, complementary).
 *
 * Run:  bun examples/colors.ts
 */

import {
  newStyle,
  joinHorizontal,
  joinVertical,
  blend1D,
  darken,
  lighten,
  complementary,
  Top,
  Left,
  type Color,
} from '../src/index.js';

const heading = newStyle().foreground('#cdd6f4').bold(true).marginTop(1);
const caption = newStyle().foreground('#6c7086');
const swatch = (c: Color, w = 2) => newStyle().background(c).render(' '.repeat(w));

const ansi16 = [0, 1].map((row) =>
  Array.from({ length: 8 }, (_, i) => swatch(row * 8 + i, 4)).join(''),
);

const ansi256 = Array.from({ length: 6 }, (_, row) =>
  Array.from({ length: 36 }, (_, col) => swatch(16 + row * 36 + col, 2)).join(''),
);
const grays = Array.from({ length: 24 }, (_, i) => swatch(232 + i, 3)).join('');

const gradient = (stops: Color[]) => blend1D(72, ...stops).map((c) => swatch(c, 1)).join('');

const base = '#f38ba8';
const utilities = joinHorizontal(
  Top,
  ...[
    ['darken 30%', darken(base, 0.3)],
    ['base', base],
    ['lighten 30%', lighten(base, 0.3)],
    ['complementary', complementary(base)],
  ].map(([name, c]) =>
    joinVertical(Left, swatch(c as Color, 14), caption.width(16).render(name as string)),
  ),
);

console.log(
  joinVertical(
    Left,
    heading.marginTop(0).render('ANSI 16'),
    ...ansi16,
    heading.render('ANSI 256'),
    ...ansi256,
    grays,
    heading.render('True color — blend1D'),
    gradient(['#f38ba8', '#fab387', '#f9e2af', '#a6e3a1']),
    gradient(['#89b4fa', '#cba6f7', '#f5c2e7']),
    heading.render('darken · lighten · complementary'),
    utilities,
  ),
);
