# lipgloss

CSS-like terminal styling for JavaScript. Zero dependencies, multi-runtime (Node.js, Bun, Deno).

Ported from [charmbracelet/lipgloss](https://github.com/charmbracelet/lipgloss) (Go) to TypeScript.

## Install

```bash
npm install lipgloss
# or
bun add lipgloss
# or
deno add npm:lipgloss
```

## Quick Start

```ts
import { newStyle, normalBorder, roundedBorder, Center } from 'lipgloss';

// Create a style
const style = newStyle()
  .bold(true)
  .foreground('#FF6B6B')
  .background('#2D2D2D')
  .padding(1, 2)
  .border(roundedBorder())
  .borderForeground('#FF6B6B')
  .width(40)
  .align(Center);

console.log(style.render('Hello, Lipgloss!'));
```

## Features

- **Fluent, immutable API** — every setter returns a new `Style` (safe to share and compose)
- **CSS-like box model** — padding, margin, border, width, height, alignment
- **10 built-in border styles** — normal, rounded, block, thick, double, hidden, ASCII, markdown, and more
- **Full ANSI color support** — basic 16, 256-color palette, and 24-bit RGB
- **Text attributes** — bold, italic, underline (5 styles), strikethrough, reverse, blink, faint
- **Layout utilities** — `joinHorizontal`, `joinVertical`, `place`, `placeHorizontal`, `placeVertical`
- **Color utilities** — `complementary`, `darken`, `lighten`, `isDarkColor`, `lightDark`, `alpha`
- **Zero dependencies** — pure TypeScript, works everywhere
- **TypeScript-first** — full type declarations included

## API

### Style

```ts
import { newStyle, Style } from 'lipgloss';

const s = newStyle();
```

Every setter returns a new `Style` instance (immutable):

```ts
const base = newStyle().foreground('#7D56F4');
const title = base.bold(true).padding(0, 1);
const body = base.faint(true);
```

#### Text Attributes

```ts
s.bold(true)
s.italic(true)
s.underline(true)
s.underlineStyle('curly')  // 'none' | 'single' | 'double' | 'curly' | 'dotted' | 'dashed'
s.strikethrough(true)
s.reverse(true)
s.blink(true)
s.faint(true)
```

#### Colors

```ts
// Hex (#RGB or #RRGGBB)
s.foreground('#ff0000')
s.background('#2D2D2D')
s.underlineColor('#00ff00')

// ANSI basic (0-15)
import { Red, BrightCyan } from 'lipgloss';
s.foreground(Red)

// ANSI 256 (16-255)
s.foreground(196)

// RGB object
s.foreground({ r: 255, g: 107, b: 107 })
```

#### Dimensions

```ts
s.width(40)       // fixed width (content wraps/pads to fit)
s.height(5)       // fixed height
s.maxWidth(80)    // truncate lines exceeding this
s.maxHeight(24)   // truncate output exceeding this many lines
```

#### Alignment

```ts
import { Left, Center, Right, Top, Bottom } from 'lipgloss';

s.align(Center)             // horizontal only
s.align(Center, Bottom)     // horizontal and vertical
s.alignHorizontal(Right)
s.alignVertical(Top)
```

#### Padding & Margin (CSS shorthand)

```ts
s.padding(1)          // all sides
s.padding(1, 2)       // vertical, horizontal
s.padding(1, 2, 3, 4) // top, right, bottom, left
s.paddingTop(1)
s.paddingLeft(2)

s.margin(1, 2)
s.marginBackground('#333')  // color the margin area
```

#### Borders

```ts
import {
  normalBorder, roundedBorder, blockBorder, thickBorder,
  doubleBorder, hiddenBorder, asciiBorder, markdownBorder,
  outerHalfBlockBorder, innerHalfBlockBorder,
} from 'lipgloss';

s.border(roundedBorder())                    // all sides
s.border(normalBorder(), true, false)        // top+bottom only
s.border(normalBorder(), true, true, true, true)  // explicit all

s.borderForeground('#FF6B6B')               // all sides same color
s.borderForeground('#f00', '#0f0', '#00f', '#ff0')  // CSS shorthand
s.borderBackground('#2D2D2D')
```

#### Other

```ts
s.inline(true)           // strip newlines
s.tabWidth(2)            // tab stop width (default 4, -1 to preserve tabs)
s.transform(s => s.toUpperCase())
s.hyperlink('https://example.com')
s.setString('prefix')    // prepend when rendering
s.colorWhitespace(true)  // apply bg color to padding spaces
s.underlineSpaces(true)
s.strikethroughSpaces(true)
```

#### Rendering

```ts
const output = style.render('Hello, World!');
console.log(output);

// render() joins multiple args with space
style.render('Hello,', 'World!');

// toString() renders the setString value
const s = newStyle().setString('Hello').bold(true);
console.log(`${s}`);  // bold "Hello"
```

#### Inherit

Copy style properties from another style (padding/margin excluded):

```ts
const parent = newStyle().bold(true).foreground('#FF6B6B');
const child = newStyle().italic(true).inherit(parent);
// child is now bold + italic + #FF6B6B foreground
```

#### Getters

Every property has a corresponding getter:

```ts
s.getBold()                // boolean
s.getForeground()          // Color | null
s.getWidth()               // number
s.getPadding()             // { top, right, bottom, left }
s.getHorizontalFrameSize() // margin + border + padding (horizontal)
s.getFrameSize()           // { x, y }
```

### Layout

```ts
import {
  joinHorizontal, joinVertical,
  place, placeHorizontal, placeVertical,
  Top, Bottom, Center, Left, Right,
} from 'lipgloss';

// Join blocks side by side (vertical alignment)
joinHorizontal(Top, blockA, blockB, blockC);
joinHorizontal(Center, blockA, blockB);

// Stack blocks vertically (horizontal alignment)
joinVertical(Left, blockA, blockB);
joinVertical(Center, blockA, blockB);

// Place content in an unstyled box
place(80, 24, Center, Center, 'Hello');
placeHorizontal(80, Center, 'Hello');
placeVertical(24, Center, 'Hello');
```

### Color Utilities

```ts
import {
  parseColor, colorToRGB, isDarkColor,
  lightDark, complementary, darken, lighten, alpha,
} from 'lipgloss';

isDarkColor('#1a1a2e')     // true
isDarkColor('#ffffff')     // false

const pick = lightDark(isDarkColor('#1a1a2e'));
pick('#333', '#eee')       // returns '#eee' (dark background → use light color)

complementary('#ff0000')   // ~cyan
darken('#ff6b6b', 0.3)    // 30% darker
lighten('#333333', 0.2)   // 20% lighter
alpha('#ff0000', 0.5)     // { r: 128, g: 0, b: 0 }
```

### ANSI Utilities

```ts
import { stripAnsi, stringWidth, truncate, styled, SGR } from 'lipgloss';

stripAnsi('\x1b[1mHello\x1b[0m')  // 'Hello'
stringWidth('\x1b[1mHello\x1b[0m') // 5 (ignores ANSI, handles CJK)
truncate(longString, 40)           // truncate to 40 visible chars
styled('Hi', { bold: true, fg: { type: 'rgb', value: 0, r: 255, g: 0, b: 0 } })
```

## Attribution

This is a TypeScript port of [charmbracelet/lipgloss](https://github.com/charmbracelet/lipgloss), originally written in Go by [Charmbracelet, Inc.](https://charm.sh). Licensed under MIT.

## License

MIT
