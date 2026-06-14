import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App shell', () => {
  it('renders the G001/G002 planner surface with privacy and explicit scenario affordances', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /compare coffee timing/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /balanced profile/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /add coffee/i })).toBeInTheDocument();
    expect(screen.getByText(/share links include only calculation essentials/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add manual coffee/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /scenario 1/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /scenario 2/i })).toBeInTheDocument();
    expect(screen.getByText(/Add coffee to Scenario 1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Scenario 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Scenario 2/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: /caffeine concentration over time/i })).toBeInTheDocument();
    expect(screen.getAllByText(/reference line/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/sleep target/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/bedtime/i).length).toBeGreaterThan(0);
  });

  it('adds new intakes only to the selected scenario while keeping both graph series visible', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('radio', { name: /scenario 2/i }));
    fireEvent.change(screen.getByLabelText(/Manual label/i), { target: { value: 'Scenario two espresso' } });
    fireEvent.change(screen.getByLabelText(/Manual caffeine \(mg\)/i), { target: { value: '95' } });
    fireEvent.click(screen.getByRole('button', { name: /add manual coffee/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/added to Scenario 2/i);
    const scenarioOne = screen.getByRole('region', { name: 'Scenario 1' });
    const scenarioTwo = screen.getByRole('region', { name: 'Scenario 2' });
    expect(within(scenarioOne).queryByText('Scenario two espresso')).not.toBeInTheDocument();
    expect(within(scenarioTwo).getByText('Scenario two espresso')).toBeInTheDocument();
    expect(within(scenarioTwo).getByText('95 mg')).toBeInTheDocument();
    expect(screen.getByText(/Add coffee to Scenario 2/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /caffeine concentration over time/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Scenario 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Scenario 2/i).length).toBeGreaterThan(0);
  });

  it('guards out-of-range weight edits instead of crashing the simulation render', () => {
    render(<App />);

    const weightInput = screen.getByLabelText(/Weight \(kg\)/i);
    fireEvent.change(weightInput, { target: { value: '251' } });
    fireEvent.blur(weightInput);

    expect(screen.getByRole('status')).toHaveTextContent(/between 25 and 250 kg/i);
    expect(screen.getByRole('img', { name: /caffeine concentration over time/i })).toBeInTheDocument();
  });

  it('does not change graph series when editing the selected-product draft', () => {
    render(<App />);

    expect(screen.getAllByText(/Scenario 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Scenario 2/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/With Melozio Boost/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Override caffeine \(mg\)/i), { target: { value: '150' } });

    expect(screen.queryByText(/With Melozio Boost/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Scenario 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Scenario 2/i).length).toBeGreaterThan(0);
  });
});
