import { describe, expect, it } from 'bun:test';
import pkg from '../package.json';

describe('package.json', () => {
  // TypeScript is only needed to build and type-check this package. As a
  // required peer it made npm install it for every consumer, JavaScript too.
  it('does not require TypeScript from consumers', () => {
    const peers = (pkg as { peerDependencies?: Record<string, string> }).peerDependencies ?? {};
    expect(peers).not.toHaveProperty('typescript');
    expect(pkg.devDependencies).toHaveProperty('typescript');
  });
});
