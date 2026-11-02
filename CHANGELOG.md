# Changelog

## 1.1.4

- Fix: downsampling truecolor to 256 or 16 colours (`renderColorProfile`,
  `Renderer`, `ColorProfileWriter`, `print*`/`sprint*`/`fprint*`) now picks the
  same colour as Go. It chose the nearest palette colour by RGB distance;
  x/ansi `Convert256` compares the nearest colour of the 6x6x6 cube with the
  nearest grey by HSLuv distance, so for example `#112233` is 17 in Go and was
  235 here. Of 70,909 sampled colours 4,807 came out different at 256 colours
  and 3,824 at 16 colours; all of them now match, as do all 16,777,216 24-bit
  colours when compared with Go built for amd64. (Go built for arm64 fuses
  `col.R*255 - 35` into an FMA instruction and differs from that on
  226 of the 70,909; the port follows the unfused arithmetic.)
- Fix: the colour writer writes a reset parameter as an empty one, as
  colorprofile does: `ESC[0m` becomes `ESC[m`, `ESC[0;1m` becomes `ESC[;1m`.
  Colour parameters outside 0-255 wrap like Go's `uint8` instead of being
  passed to the converter as they are.
- New: `src/colorconvert.ts` holds `convert256` and `convert16`.
- Tests: Convert256/Convert16 and the SGR writer are compared with fixtures
  generated from `colorprofile@v0.4.3` and `x/ansi@v0.11.9`
  (`tests/fixtures/gen-colour-fixture.go`).
- Not changed, and different from Go: colorprofile merges nothing across
  sequences, so the port still writes one SGR per attribute where Go packs them
  into one; Go writes underline as `4;4` because lipgloss emits `Underline(true)`
  and then `UnderlineStyle(single)`; at the ASCII profile Go turns a colour-only
  sequence into `ESC[m` (a reset), where the port drops it; at the ANSI profile
  Go keeps an underline colour as `58;5;n`, where the port drops it; and Go's
  writer flattens `4:3` to `4;3`, which the port keeps as `4:3`.

## 1.1.3

- Fix: `typescript` is no longer a required peer dependency. It was only needed
  to build the package, but npm installed it for every consumer of lipgloss and
  of the ports built on it, plain JavaScript projects included.

## 1.1.2

- Fix: OSC 8 hyperlinks are now ended with BEL, matching Lip Gloss v2.0.6 /
  x/ansi byte-for-byte. `setHyperlink`/`resetHyperlink`, `Style.render()` with
  `hyperlink()`, `WrapWriter` (and so `wrap`/`Style.render()` with a width),
  and `Canvas`/`Compositor` rendering all emitted `ESC \` before.
- Fix: `truncate` is now a faithful port of x/ansi `Truncate`: escape sequences
  after the cut are kept verbatim (so a link is closed by the input's own
  closing sequence, with its original BEL or ST terminator) and no extra
  SGR/hyperlink resets are appended. Previously a cut BEL-terminated link was
  closed with `ESC \`. `truncate(s, 0)` keeps the escapes, as upstream does.
- Fix: `sliceAnsi` (and so `styleRanges`) now follows x/ansi `Cut`/
  `TruncateLeft`, retaining escape sequences after the range.
- Fix: `wrap` no longer appends style/link resets for an unclosed style or
  link in its input (upstream returns before its deferred `WrapWriter.Close`).
- Fix: styled text ends with `ESC[m` (`ansi.ResetStyle`) instead of `ESC[0m`,
  and `Canvas` render writes the style before the link and closes the link
  before the style, as ultraviolet does.
- Tests: 357 golden cases generated from `charm.land/lipgloss/v2@v2.0.6` and
  `x/ansi@v0.11.8` (`Wrap`, `WrapWriter` whole and byte-chunked, `Truncate`,
  `StyleRanges`, `Compositor.Render`, `Style.Hyperlink` with width, padding,
  alignment, borders and `MaxWidth`, `SetHyperlink`/`ResetHyperlink`) for
  links ending in both ST and BEL.

## 1.1.1

- Fix: `wrap()` and `Style.render()` with a width no longer strip leading
  whitespace (indentation) from every line. `wrap` is now a faithful port of
  `charmbracelet/x/ansi` `Wrap`, as used by Lip Gloss v2: indentation and
  inner whitespace are preserved, only the whitespace at a soft-wrap point is
  dropped, and `-` is always a breakpoint.
- Fix: `WrapWriter` (and so `wrap`) emits `ESC[m` (`ansi.ResetStyle`) instead
  of `ESC[0m` when closing styles at inserted line breaks, matching upstream
  byte-for-byte.
- Tests: 253 golden cases generated from `charm.land/lipgloss/v2@v2.0.6`
  (`lipgloss.Wrap` and `NewStyle().Width(n)` with padding, alignment and tab
  width variants) covering indentation, tabs, wrap-point spaces, CJK and ANSI.
- Parity target bumped to Lip Gloss v2.0.6 (no port-relevant changes).
