/**
 * wrap() parity — @oakoliver/lipgloss
 *
 * Wraps the same syntax-highlighted Go snippet with three implementations and
 * compares them byte for byte (ANSI escapes included):
 *
 *   1. before: wrap() from 1.1.0 (examples/wrap-parity/legacy-wrap.ts), which
 *      stripped leading indentation from every line;
 *   2. after:  wrap() from this checkout (src/);
 *   3. upstream: lipgloss.Wrap from charm.land/lipgloss/v2@v2.0.6, run live via
 *      the Go program in examples/wrap-parity/goref (needs a Go toolchain; the
 *      column is skipped with a message when `go` is missing or fails).
 *
 * The input is a made-up snippet bundled here. Leading spaces are drawn as
 * faint dots.
 *
 * Run:  bun examples/wrap-parity.ts
 *       bun examples/wrap-parity.ts --goldens   (also score both TypeScript
 *                                                versions against the upstream
 *                                                wrap goldens in tests/fixtures)
 *       GO=/path/to/go bun examples/wrap-parity.ts   (override the go binary)
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  newStyle, joinHorizontal, joinVertical, roundedBorder, thickBorder,
  blend1D, wrap, stripAnsi, Center, Left, Top, type Color,
} from '../src/index.js';
import { wrap as legacyWrap } from './wrap-parity/legacy-wrap.js';
import goldens from '../tests/fixtures/wrap-whitespace-v2.0.6.json';
import pkg from '../package.json';

const GOREF_DIR = fileURLToPath(new URL('./wrap-parity/goref/', import.meta.url));
const PINK = '#F25D94', VIOLET = '#7D56F4', CYAN = '#14F9D5', AMBER = '#FFB86C', GREEN = '#50FA7B', RED = '#FF5555';
const FG = '#E6E6F0', DIM = '#6C6F85', FAINT = '#3E4058';

// ── a Go snippet, highlighted with lipgloss styles (so the input is full of SGR) ──
const kw = newStyle().foreground(PINK).bold(true), str = newStyle().foreground('#F1FA8C'),
  com = newStyle().foreground('#6272A4').italic(true), fn = newStyle().foreground(CYAN), ty = newStyle().foreground(AMBER);
const src = [
  `${kw.render('func')} ${fn.render('render')}(items []${ty.render('Item')}) ${ty.render('string')} {`,
  `    ${kw.render('var')} b strings.${ty.render('Builder')}`,
  `    ${kw.render('for')} i, it := ${kw.render('range')} items {`,
  `        ${com.render('// indentation must survive the wrap')}`,
  `        fmt.${fn.render('Fprintf')}(&b, ${str.render('"%d: %s\\n"')}, i, it.Name)`,
  `    }`,
  `    ${kw.render('return')} b.${fn.render('String')}()`,
  `}`,
].join('\n');

const WIDTHS = [40, 30];

// ── upstream reference: `go run` the goref program; degrade gracefully ──
function runGo(): { out: string[] } | { error: string } {
  const go = process.env.GO || 'go';
  const r = spawnSync(go, ['run', '.'], {
    cwd: GOREF_DIR,
    input: JSON.stringify({ in: src, widths: WIDTHS }),
    encoding: 'utf8',
  });
  if (r.error) return { error: `\`${go}\` not found: install Go to see the upstream column` };
  if (r.status !== 0) return { error: `\`${go} run\` failed: ${(r.stderr || '').trim().split('\n').pop()}` };
  try {
    return { out: JSON.parse(r.stdout) };
  } catch {
    return { error: 'goref printed invalid JSON' };
  }
}
const goRef = runGo();
const goOut = 'out' in goRef ? goRef.out : null;
if (!goOut) process.stderr.write(`wrap-parity: skipping the Go column (${'error' in goRef ? goRef.error : ''})\n`);

// show leading indentation as faint dots so it is visible in a screenshot
const dots = (s: string) => s.split('\n').map(line => {
  const plain = stripAnsi(line);
  const lead = plain.length - plain.trimStart().length;
  if (!lead || plain.trim() === '') return line;
  return newStyle().foreground(FAINT).render('·'.repeat(lead)) + line.replace(/^((?:\x1b\[[0-9;]*m)*) +/, '$1');
}).join('\n');

const COL = 44;
type Verdict = 'same' | 'differs' | 'reference' | 'unchecked';
function panel(title: string, sub: string, accent: Color, body: string, v: Verdict, h: number): string {
  const badge = {
    same: newStyle().foreground(GREEN).bold(true).render('● byte-identical to Go'),
    differs: newStyle().foreground(RED).bold(true).render('● differs from Go'),
    reference: newStyle().foreground(DIM).render('reference output'),
    unchecked: newStyle().foreground(DIM).render('○ not compared (no Go column)'),
  }[v];
  const head = joinVertical(Left,
    newStyle().foreground(accent).bold(true).render(title) + '  ' + newStyle().foreground(DIM).render(sub),
    badge);
  return newStyle().border(roundedBorder()).borderForeground(v === 'differs' ? '#5A2A3A' : accent)
    .padding(0, 1).width(COL).render(joinVertical(Left, head,
      newStyle().foreground(FAINT).render('─'.repeat(COL - 4)), newStyle().height(h).render(dots(body))));
}
const verdict = (out: string, i: number): Verdict => !goOut ? 'unchecked' : out === goOut[i] ? 'same' : 'differs';

const rows: string[] = [];
WIDTHS.forEach((w, i) => {
  const oldO = legacyWrap(src, w, ''), newO = wrap(src, w, '');
  const goO = goOut ? goOut[i] : newStyle().foreground(DIM).italic(true).width(COL - 4)
    .render('error' in goRef ? goRef.error : '');
  const h = Math.max(...[oldO, newO, goO].map(s => s.split('\n').length));
  const ruler = '  ' + blend1D(w, VIOLET, PINK).map((c, j) => newStyle().foreground(c).render(j === 0 ? '├' : j === w - 1 ? '┤' : '─')).join('') +
    newStyle().foreground(FG).bold(true).render(`  wrap(src, ${w})`) + newStyle().foreground(DIM).render('  same input, three implementations');
  rows.push(ruler);
  rows.push(joinHorizontal(Top,
    panel('before', '@oakoliver/lipgloss 1.1.0', '#8B6F7A', oldO, verdict(oldO, i), h), ' ',
    panel('after', `@oakoliver/lipgloss ${pkg.version}`, CYAN, newO, verdict(newO, i), h), ' ',
    panel('upstream', 'Go lipgloss v2.0.6', goOut ? AMBER : FAINT, goO, goOut ? 'reference' : 'unchecked', h)));
  rows.push('');
});

// ── optional (--goldens): score both versions against the upstream wrap goldens ──
const SHOW_GOLDENS = process.argv.slice(2).includes('--goldens');
function goldenTally(): string {
  let oldPass = 0, newPass = 0, n = 0;
  for (const c of goldens as { kind: string; in: string; w: number; out: string }[]) if (c.kind === 'wrap') {
    n++; if (legacyWrap(c.in, c.w, '') === c.out) oldPass++; if (wrap(c.in, c.w, '') === c.out) newPass++;
  }
  const bar = (pass: number, total: number, c: Color) => {
    const W = 30, fill = Math.round(W * pass / total);
    return newStyle().foreground(c).render('█'.repeat(fill)) + newStyle().foreground(FAINT).render('░'.repeat(W - fill)) +
      newStyle().foreground(FG).bold(true).render(`  ${pass}/${total}`);
  };
  const tally = newStyle().border(thickBorder()).borderForegroundBlend(VIOLET, PINK, AMBER).padding(0, 2).render(joinVertical(Left,
    newStyle().foreground(FG).bold(true).render('lipgloss.Wrap goldens from upstream v2.0.6'),
    '',
    newStyle().foreground(DIM).width(8).render('1.1.0') + bar(oldPass, n, RED),
    newStyle().foreground(DIM).width(8).render(pkg.version) + bar(newPass, n, GREEN)));
  return tally;
}

const note = newStyle().foreground(DIM).width(62).padding(0, 2).render(
  'Outputs are compared byte for byte, ANSI escapes included. Faint dots mark the leading spaces a wrap kept: ' +
  'the old port stripped every indent, even on lines that already fit. The Go column is lipgloss.Wrap from ' +
  'charm.land/lipgloss/v2@v2.0.6, executed live.');

const T = 'wrap(): indentation survives the wrap';
const title = blend1D(T.length, CYAN, VIOLET, PINK).map((c, i) => newStyle().foreground(c).bold(true).render(T[i])).join('');
const footer = SHOW_GOLDENS ? joinHorizontal(Center, goldenTally(), note) : note;
process.stdout.write('\n' + joinVertical(Left, '  ' + title, '', ...rows, footer) + '\n');
