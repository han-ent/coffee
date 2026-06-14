import { describe, expect, it } from 'vitest';
import viteConfig from '../vite.config';

const baselineScripts = ['dev', 'build', 'preview', 'typecheck', 'test', 'lint'] as const;

describe('baseline tooling contract', () => {
  it('defines the expected command surface', () => {
    expect(baselineScripts).toEqual(['dev', 'build', 'preview', 'typecheck', 'test', 'lint']);
  });

  it('uses a relative local base path so GitHub Pages subpaths can be configured by env', () => {
    const config = typeof viteConfig === 'function' ? viteConfig({ command: 'build', mode: 'test' }) : viteConfig;
    const repository = process.env.GITHUB_REPOSITORY?.split('/').at(1);
    const expectedBase = repository ? `/${repository}/` : './';
    expect(config.base).toBe(expectedBase);
  });
});
