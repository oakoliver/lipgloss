# Changelog

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
