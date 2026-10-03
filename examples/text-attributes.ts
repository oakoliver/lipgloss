/**
 * Text Attributes Example — @oakoliver/lipgloss
 *
 * Bold, italic, every underline style, strikethrough, reverse and faint.
 *
 * Run:  bun examples/text-attributes.ts
 */

import { newStyle, joinVertical, Left } from '../src/index.js';

const label = newStyle().foreground('#6c7086').width(40);
const text = newStyle().foreground('#cdd6f4');

const line = (code: string, styled: string) => label.render(code) + styled;

console.log(
  joinVertical(
    Left,
    line('s.bold(true)', text.bold(true).render('Lip Gloss')),
    line('s.italic(true)', text.italic(true).render('Lip Gloss')),
    line('s.underline(true)', text.underline(true).render('Lip Gloss')),
    line("s.underlineStyle('double')", text.underlineStyle('double').render('Lip Gloss')),
    line("s.underlineStyle('curly')", text.underlineStyle('curly').underlineColor('#f38ba8').render('Lip Gloss')),
    line("s.underlineStyle('dotted')", text.underlineStyle('dotted').render('Lip Gloss')),
    line("s.underlineStyle('dashed')", text.underlineStyle('dashed').render('Lip Gloss')),
    line('s.strikethrough(true)', text.strikethrough(true).render('Lip Gloss')),
    line('s.reverse(true)', text.reverse(true).render('Lip Gloss')),
    line('s.faint(true)', text.faint(true).render('Lip Gloss')),
    line(
      "s.bold().italic().foreground('#f5c2e7')",
      newStyle().bold(true).italic(true).foreground('#f5c2e7').render('Lip Gloss'),
    ),
  ),
);
