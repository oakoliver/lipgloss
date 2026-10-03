/**
 * Borders Example — @oakoliver/lipgloss
 *
 * Every built-in border style, with per-side colors on the last row.
 *
 * Run:  bun examples/borders.ts
 */

import {
  newStyle,
  joinHorizontal,
  joinVertical,
  normalBorder,
  roundedBorder,
  thickBorder,
  doubleBorder,
  blockBorder,
  outerHalfBlockBorder,
  innerHalfBlockBorder,
  asciiBorder,
  markdownBorder,
  hiddenBorder,
  Top,
  Left,
  Center,
  type Border,
} from '../src/index.js';

const box = (name: string, border: Border, color: string) =>
  newStyle()
    .border(border)
    .borderForeground(color)
    .foreground('#cdd6f4')
    .width(26)
    .padding(1, 0)
    .align(Center)
    .marginRight(2)
    .render(name);

const row = (...boxes: string[]) => joinHorizontal(Top, ...boxes);

const output = joinVertical(
  Left,
  row(
    box('normalBorder', normalBorder(), '#89b4fa'),
    box('roundedBorder', roundedBorder(), '#cba6f7'),
    box('thickBorder', thickBorder(), '#f38ba8'),
  ),
  row(
    box('doubleBorder', doubleBorder(), '#fab387'),
    box('blockBorder', blockBorder(), '#a6e3a1'),
    box('asciiBorder', asciiBorder(), '#94e2d5'),
  ),
  row(
    box('outerHalfBlockBorder', outerHalfBlockBorder(), '#f9e2af'),
    box('innerHalfBlockBorder', innerHalfBlockBorder(), '#74c7ec'),
    box('hiddenBorder', hiddenBorder(), '#cdd6f4'),
  ),
  row(
    box('markdownBorder', markdownBorder(), '#b4befe'),
    newStyle()
      .border(roundedBorder())
      .borderForeground('#f38ba8', '#a6e3a1', '#89b4fa', '#f9e2af')
      .foreground('#cdd6f4')
      .width(54)
      .padding(1, 0)
      .align(Center)
      .render("borderForeground('#f38ba8', '#a6e3a1', …)"),
  ),
);

console.log(output);
