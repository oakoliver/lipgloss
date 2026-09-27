# Changelog

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
