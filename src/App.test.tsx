import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App shell', () => {
  it('renders the G003 planner surface with privacy and manual-entry affordances', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /plan coffee timing/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /balanced profile/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /add coffee/i })).toBeInTheDocument();
    expect(screen.getByText(/share links include only calculation essentials/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add manual coffee/i })).toBeInTheDocument();
  });
});
