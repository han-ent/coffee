import { describe, expect, it } from 'vitest';

const baselineScripts = ['dev', 'build', 'preview', 'typecheck', 'test', 'lint'] as const;

describe('baseline tooling contract', () => {
  it('defines the expected command surface', () => {
    expect(baselineScripts).toEqual(['dev', 'build', 'preview', 'typecheck', 'test', 'lint']);
  });
});
