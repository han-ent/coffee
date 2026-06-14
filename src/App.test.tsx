import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App foundation', () => {
  it('renders the product foundation without implementing scoped-out features', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /plan coffee timing/i })).toBeInTheDocument();
    expect(screen.getByText(/Vite, React, and TypeScript/i)).toBeInTheDocument();
    expect(screen.getByText(/does not provide medical advice/i)).toBeInTheDocument();
    expect(screen.getByText(/intentionally stops before the PK engine/i)).toBeInTheDocument();
  });
});
