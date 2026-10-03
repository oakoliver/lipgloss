/**
 * Layout Example — @oakoliver/lipgloss
 *
 * joinHorizontal, joinVertical and place with different alignments.
 *
 * Run:  bun examples/joins.ts
 */

import {
  newStyle,
  joinHorizontal,
  joinVertical,
  place,
  roundedBorder,
  withWhitespaceChars,
  withWhitespaceStyle,
  Top,
  Bottom,
  Center,
  Left,
  Right,
} from '../src/index.js';

const block = (text: string, color: string, height: number) =>
  newStyle()
    .border(roundedBorder())
    .borderForeground(color)
    .foreground(color)
    .width(10)
    .height(height)
    .align(Center, Center)
    .render(text);

const caption = newStyle().foreground('#6c7086').marginBottom(1);

const blocks = () => [block('A', '#f38ba8', 1), block('B', '#a6e3a1', 4), block('C', '#89b4fa', 2)];

const section = (title: string, body: string) =>
  joinVertical(Left, body, caption.render(title));

const column = newStyle().marginRight(4);

const horizontal = joinHorizontal(
  Top,
  column.render(section('joinHorizontal(Top, …)', joinHorizontal(Top, ...blocks()))),
  column.render(section('joinHorizontal(Center, …)', joinHorizontal(Center, ...blocks()))),
  section('joinHorizontal(Bottom, …)', joinHorizontal(Bottom, ...blocks())),
);

const narrow = (text: string, color: string, width: number) =>
  newStyle().border(roundedBorder()).borderForeground(color).foreground(color).width(width).align(Center).render(text);

const stack = () => [narrow('wide block', '#cba6f7', 22), narrow('mid', '#fab387', 12), narrow('x', '#94e2d5', 4)];

const vertical = joinHorizontal(
  Top,
  column.render(section('joinVertical(Left, …)', joinVertical(Left, ...stack()))),
  column.render(section('joinVertical(Center, …)', joinVertical(Center, ...stack()))),
  section('joinVertical(Right, …)', joinVertical(Right, ...stack())),
);

const placed = section(
  "place(60, 7, Center, Center, …, withWhitespaceChars('·'))",
  place(
    60,
    7,
    Center,
    Center,
    newStyle().border(roundedBorder()).borderForeground('#f5c2e7').foreground('#f5c2e7').padding(0, 2).render('centered'),
    withWhitespaceChars('·'),
    withWhitespaceStyle(newStyle().foreground('#45475a')),
  ),
);

console.log(joinVertical(Left, horizontal, vertical, placed));
