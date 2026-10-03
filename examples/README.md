# Examples

Run from the repository root with [Bun](https://bun.sh). Each example imports
this checkout's `src/` directly, so it shows the code you have, with no build
step. Use a truecolor terminal.

| Example | What it shows | Run |
|---------|---------------|-----|
| `layout.ts` | Port of upstream's `examples/layout`: tabs, a dialog, a color grid, lists, history columns and a status bar. | `bun examples/layout.ts` |
| `poster.ts` | One-screen tour: block-letter banner with a rotated `blend2D` gradient, border gallery (`borderForegroundBlend`, per-side colors, half-block borders), a dialog `place()`d on a patterned field, and overlapping layers from `newCompositor()`. All content is made up. `--goldens` adds a badge scoring this checkout against the upstream Go goldens in `tests/fixtures`. Best at 124 columns. | `bun examples/poster.ts` |
| `text-attributes.ts` | Bold, italic, every underline style, strikethrough, reverse and faint, each next to the method that produces it. | `bun examples/text-attributes.ts` |
| `colors.ts` | The 16 ANSI colors, the 256-color palette, `blend1D` gradients, and `darken`/`lighten`/`complementary`. | `bun examples/colors.ts` |
| `borders.ts` | Every built-in border style, plus per-side border colors. | `bun examples/borders.ts` |
| `joins.ts` | `joinHorizontal`, `joinVertical` and `place` with each alignment. | `bun examples/joins.ts` |
| `wrap-parity.ts` | The same highlighted Go snippet wrapped at 40 and 30 columns by the 1.1.0 `wrap()` (which stripped indentation), by this checkout, and by upstream Go `lipgloss.Wrap`, compared byte for byte. The input is a bundled, made-up snippet. `--goldens` also scores both TypeScript versions against the upstream wrap goldens in `tests/fixtures`. Best at 136 columns. | `bun examples/wrap-parity.ts` |

## wrap-parity requirements

- `wrap-parity/legacy-wrap.ts` is the 1.1.0 `wrap()`, kept verbatim for the
  "before" column. Don't use it in new code.
- The "upstream" column runs `wrap-parity/goref` (`lipgloss.Wrap` from
  `charm.land/lipgloss/v2@v2.0.6`) with `go run`, so it needs a Go toolchain
  (the first run downloads the module). Set `GO=/path/to/go` to pick a
  specific binary. If `go` is missing or fails, the column is skipped with a
  message and the other two columns are still rendered.

## Sibling packages

These examples need no other `@oakoliver` packages. To type-check them,
run `bunx tsc --noEmit -p examples`.
