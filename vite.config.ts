import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function resolveBasePath() {
  if (process.env.BASE_PATH) return process.env.BASE_PATH;
  const repository = process.env.GITHUB_REPOSITORY?.split('/').at(1);
  return repository ? `/${repository}/` : './';
}

export default defineConfig({
  base: resolveBasePath(),
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setup.ts'],
  },
});
