import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('img', { name: /caffeine concentration over time/i })).toBeInTheDocument();
    expect(screen.getAllByText(/sleep target/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/bedtime/i).length).toBeGreaterThan(0);
  });

  it('guards out-of-range weight edits instead of crashing the simulation render', () => {
    render(<App />);

    const weightInput = screen.getByLabelText(/Weight \(kg\)/i);
    fireEvent.change(weightInput, { target: { value: '251' } });

    expect(screen.getByRole('status')).toHaveTextContent(/between 25 and 250 kg/i);
    expect(screen.getByRole('img', { name: /caffeine concentration over time/i })).toBeInTheDocument();
  });

  it('keeps the selected-coffee comparison preview off until explicitly enabled', () => {
    render(<App />);

    expect(screen.getByText('Current plan')).toBeInTheDocument();
    expect(screen.queryByText(/With Melozio Boost/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Preview selected coffee on graph before adding/i));

    expect(screen.getByText(/With Melozio Boost/i)).toBeInTheDocument();
  });

});
