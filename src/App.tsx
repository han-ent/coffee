import { useEffect, useMemo, useState } from 'react';
import { CaffeineGraph, type GraphSeries } from './components/CaffeineGraph';
import { VERTUO_SEED_CATALOG, findCatalogItem } from './catalog/vertuo';
import { coffeeProductToIntake, simulateScenario } from './domain';
import {
  SHARE_LABEL_PRIVACY_WARNING,
  addCatalogIntake,
  addManualIntake,
  createDefaultScenarioState,
  createShareUrl,
  loadScenarioState,
  loadShareFromUrl,
  removeIntake,
  saveScenarioState,
  toScenario,
  updateProfile,
  type AppScenarioState,
} from './state';
import './styles/tokens.css';
import './styles/global.css';

function toLocalInputValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string) {
  return value ? new Date(value) : new Date();
}

export function App() {
  const initialLoad = useMemo(() => {
    const shared = loadShareFromUrl();
    if (shared.ok) return { state: shared.state, notice: shared.warning ?? 'Shared scenario loaded.' };
    const stored = loadScenarioState();
    return { state: stored.state, notice: stored.ok ? '' : `Local data reset: ${stored.error}` };
  }, []);

  const [state, setState] = useState<AppScenarioState>(initialLoad.state);
  const [notice, setNotice] = useState(initialLoad.notice);
  const [catalogId, setCatalogId] = useState(VERTUO_SEED_CATALOG[0].id);
  const [caffeineOverrideMg, setCaffeineOverrideMg] = useState('');
  const [manualLabel, setManualLabel] = useState('My coffee');
  const [manualMg, setManualMg] = useState('120');
  const [consumedAt, setConsumedAt] = useState(toLocalInputValue(new Date()));
  const [shareUrl, setShareUrl] = useState('');
  const [bedtime, setBedtime] = useState(toLocalInputValue(new Date(Date.now() + 8 * 60 * 60_000)));
  const [thresholdMgPerL, setThresholdMgPerL] = useState('0.7');

  useEffect(() => {
    saveScenarioState(state);
  }, [state]);

  const selectedCoffee = findCatalogItem(catalogId);
  const scenario = useMemo(() => toScenario(state), [state]);
  const startAt = useMemo(() => state.intakes[0]?.consumedAt ? new Date(state.intakes[0].consumedAt) : new Date(), [state.intakes]);
  const endAt = useMemo(() => new Date(startAt.getTime() + 36 * 60 * 60_000), [startAt]);
  const threshold = Number(thresholdMgPerL) || 0.7;
  const preview = useMemo(() => simulateScenario(scenario, { startAt, endAt, stepMinutes: 5 }), [scenario, startAt, endAt]);
  const comparison = useMemo(() => {
    if (!selectedCoffee) return null;
    const candidate = coffeeProductToIntake(selectedCoffee, fromLocalInputValue(consumedAt), `compare-${selectedCoffee.id}`);
    return simulateScenario({ ...scenario, intakes: [...scenario.intakes, candidate] }, { startAt, endAt, stepMinutes: 5 });
  }, [selectedCoffee, consumedAt, scenario, startAt, endAt]);
  const graphSeries: GraphSeries[] = useMemo(() => [
    { id: 'current', label: 'Current plan', points: preview.points, tone: 'gold' },
    ...(comparison ? [{ id: 'comparison', label: `With ${selectedCoffee?.name ?? 'selected coffee'}`, points: comparison.points, tone: 'blue' } as GraphSeries] : []),
  ], [comparison, preview.points, selectedCoffee?.name]);
  const latestPoint = preview.points.at(-1);

  function handleAddCatalog() {
    const override = caffeineOverrideMg ? Number(caffeineOverrideMg) : undefined;
    setState((current) => addCatalogIntake(current, catalogId, fromLocalInputValue(consumedAt), override));
    setNotice(`${selectedCoffee?.name ?? 'Coffee'} added. You can override caffeine values whenever your source differs.`);
  }

  function handleAddManual() {
    setState((current) => addManualIntake(current, manualLabel, Number(manualMg), fromLocalInputValue(consumedAt)));
    setNotice('Manual caffeine entry added.');
  }

  function handleShare() {
    const nextShareUrl = createShareUrl(state);
    setShareUrl(nextShareUrl);
    void navigator.clipboard?.writeText(nextShareUrl).catch(() => undefined);
    setNotice('Share link created. Sensitive local-only flags were excluded.');
  }

  function handleReset() {
    setState(createDefaultScenarioState());
    setShareUrl('');
    setNotice('Scenario reset locally.');
  }

  return (
    <main className="app-shell">
      <section className="hero-card" aria-labelledby="app-title">
        <p className="eyebrow">Caffeine PK planner</p>
        <h1 id="app-title">Plan coffee timing with transparent estimates.</h1>
        <p className="hero-copy">
          Choose a focused Vertuo seed, override caffeine manually, or enter any coffee. Profile details stay
          local by default; share links include only calculation essentials and sanitized labels.
        </p>
        <div className="hero-actions" aria-label="Foundation status">
          <span className="status-pill">Static web app</span>
          <span className="status-pill">Local-first</span>
          <span className="status-pill">Non-medical estimates</span>
        </div>
      </section>

      {notice ? <div className="notice" role="status">{notice}</div> : null}

      <section className="workspace-grid" aria-label="Caffeine planner controls">
        <form className="foundation-card control-panel" onSubmit={(event) => event.preventDefault()}>
          <h2>Balanced profile</h2>
          <label>
            Weight (kg)
            <input
              type="number"
              min="25"
              max="250"
              value={state.profile.weightKg}
              onChange={(event) => setState((current) => updateProfile(current, { weightKg: Number(event.target.value) }))}
            />
          </label>
          <label>
            Sensitivity
            <select
              value={state.profile.sensitivity ?? 'typical'}
              onChange={(event) => setState((current) => updateProfile(current, { sensitivity: event.target.value as AppScenarioState['profile']['sensitivity'] }))}
            >
              <option value="low">Low</option>
              <option value="typical">Typical</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Smoking flag (local only)
            <select
              value={state.profile.smokingStatus ?? 'non-smoker'}
              onChange={(event) => setState((current) => updateProfile(current, { smokingStatus: event.target.value as AppScenarioState['profile']['smokingStatus'] }))}
            >
              <option value="non-smoker">Non-smoker</option>
              <option value="smoker">Smoker</option>
            </select>
          </label>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={Boolean(state.profile.takesOralContraceptives)}
              onChange={(event) => setState((current) => updateProfile(current, { takesOralContraceptives: event.target.checked }))}
            />
            Oral contraceptive flag (local only)
          </label>
          <label>
            Pregnancy/postpartum flag (local only)
            <select
              value={state.profile.pregnancyStatus ?? 'not-pregnant'}
              onChange={(event) => setState((current) => updateProfile(current, { pregnancyStatus: event.target.value as AppScenarioState['profile']['pregnancyStatus'] }))}
            >
              <option value="not-pregnant">Not pregnant</option>
              <option value="pregnant-or-postpartum">Pregnant/postpartum</option>
              <option value="unspecified">Prefer not to say</option>
            </select>
          </label>
        </form>

        <form className="foundation-card control-panel" onSubmit={(event) => event.preventDefault()}>
          <h2>Add coffee</h2>
          <label>
            Time consumed
            <input type="datetime-local" value={consumedAt} onChange={(event) => setConsumedAt(event.target.value)} />
          </label>
          <label>
            Vertuo seed catalog
            <select value={catalogId} onChange={(event) => setCatalogId(event.target.value)}>
              {VERTUO_SEED_CATALOG.map((coffee) => (
                <option key={coffee.id} value={coffee.id}>
                  {coffee.name} · {coffee.caffeineMg} mg
                </option>
              ))}
            </select>
          </label>
          {selectedCoffee ? (
            <p className="fine-print">
              {selectedCoffee.sizeLabel}, {selectedCoffee.servingMl} ml · {selectedCoffee.confidence}. {selectedCoffee.sourceNote}
            </p>
          ) : null}
          <label>
            Override caffeine (mg)
            <input
              type="number"
              min="1"
              placeholder={selectedCoffee ? String(selectedCoffee.caffeineMg) : '120'}
              value={caffeineOverrideMg}
              onChange={(event) => setCaffeineOverrideMg(event.target.value)}
            />
          </label>
          <button type="button" onClick={handleAddCatalog}>Add selected Vertuo</button>

          <div className="divider" />
          <label>
            Manual label
            <input value={manualLabel} maxLength={80} onChange={(event) => setManualLabel(event.target.value)} />
          </label>
          <label>
            Manual caffeine (mg)
            <input type="number" min="1" value={manualMg} onChange={(event) => setManualMg(event.target.value)} />
          </label>
          <button type="button" className="secondary-button" onClick={handleAddManual}>Add manual coffee</button>
        </form>

        <section className="foundation-card result-panel" aria-label="Scenario summary">
          <h2>Scenario</h2>
          <p className="fine-print">{SHARE_LABEL_PRIVACY_WARNING}</p>
          {state.intakes.length === 0 ? (
            <p>No caffeine intakes yet. Add a Vertuo seed or manual coffee to start.</p>
          ) : (
            <ul className="intake-list">
              {state.intakes.map((intake) => (
                <li key={intake.id}>
                  <span>{intake.label}</span>
                  <strong>{intake.caffeineMg} mg</strong>
                  <time>{new Date(intake.consumedAt).toLocaleString()}</time>
                  <button type="button" className="ghost-button" onClick={() => setState((current) => removeIntake(current, intake.id))}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="inline-control">
            Bedtime marker
            <input type="datetime-local" value={bedtime} onChange={(event) => setBedtime(event.target.value)} />
          </label>
          <label className="inline-control">
            Sleep target threshold (mg/L)
            <input type="number" min="0.1" step="0.1" value={thresholdMgPerL} onChange={(event) => setThresholdMgPerL(event.target.value)} />
          </label>
          <div className="metric-row">
            <span>Estimated half-life</span>
            <strong>{Math.round(preview.parameters.halfLifeMinutes)} min</strong>
          </div>
          <div className="metric-row">
            <span>Preview at +16h</span>
            <strong>{latestPoint ? latestPoint.concentrationMgPerL.toFixed(2) : '0.00'} mg/L</strong>
          </div>
          <button type="button" onClick={handleShare}>Create local share link</button>
          <button type="button" className="ghost-button" onClick={handleReset}>Reset</button>
          {shareUrl ? <textarea readOnly aria-label="Share URL" value={shareUrl} /> : null}
        </section>
      </section>

      <CaffeineGraph series={graphSeries} bedtime={fromLocalInputValue(bedtime)} thresholdMgPerL={threshold} />

      <aside className="assumption-panel">
        <h2>Model framing</h2>
        <p>{preview.disclaimer}</p>
        <ul>
          {preview.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
      </aside>
    </main>
  );
}
