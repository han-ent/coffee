import { useEffect, useMemo, useState } from 'react';
import { CaffeineGraph, type GraphSeries } from './components/CaffeineGraph';
import { VERTUO_SEED_CATALOG, findCatalogItem } from './catalog/vertuo';
import { simulateScenario } from './domain';
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
  updateSleepSettings,
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

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function App() {
  const initialLoad = useMemo(() => {
    const shared = loadShareFromUrl();
    if (shared.ok) return { state: shared.state, notice: shared.warning ?? 'Shared scenario loaded.' };
    const stored = loadScenarioState();
    return { state: stored.state, notice: stored.ok ? '' : `Local data reset: ${stored.error}` };
  }, []);

  const [scenarioStates, setScenarioStates] = useState<[AppScenarioState, AppScenarioState]>(() => [
    initialLoad.state,
    createDefaultScenarioState(),
  ]);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<0 | 1>(0);
  const [notice, setNotice] = useState(initialLoad.notice);
  const [catalogId, setCatalogId] = useState(VERTUO_SEED_CATALOG[0].id);
  const [caffeineOverrideMg, setCaffeineOverrideMg] = useState('');
  const [manualLabel, setManualLabel] = useState('My coffee');
  const [manualMg, setManualMg] = useState('120');
  const [consumedAt, setConsumedAt] = useState(toLocalInputValue(new Date()));
  const [shareUrl, setShareUrl] = useState('');
  const [showCandidatePreview, setShowCandidatePreview] = useState(false);

  const selectedState = scenarioStates[selectedScenarioIndex];
  const selectedScenarioLabel = selectedScenarioIndex === 0 ? 'Scenario 1' : 'Scenario 2';

  useEffect(() => {
    saveScenarioState(scenarioStates[0]);
  }, [scenarioStates]);

  const selectedCoffee = findCatalogItem(catalogId);
  const scenarios = useMemo(() => scenarioStates.map((item, index) => ({ ...toScenario(item), name: `Scenario ${index + 1}` })), [scenarioStates]);
  const startAt = useMemo(() => {
    const timestamps = scenarioStates.flatMap((item) => item.intakes.map((intake) => new Date(intake.consumedAt).getTime()));
    return timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
  }, [scenarioStates]);
  const endAt = useMemo(() => new Date(startAt.getTime() + 36 * 60 * 60_000), [startAt]);
  const threshold = selectedState.sleep.thresholdMgPerL;
  const previews = useMemo(() => scenarios.map((item) => simulateScenario(item, { startAt, endAt, stepMinutes: 1 })), [scenarios, startAt, endAt]);
  const graphSeries: GraphSeries[] = useMemo(() => [
    { id: 'scenario-1', label: 'Scenario 1', points: previews[0].points, tone: 'gold' },
    { id: 'scenario-2', label: 'Scenario 2', points: previews[1].points, tone: 'blue' },
  ], [previews]);
  const preview = previews[selectedScenarioIndex];
  const latestPoint = preview.points.at(-1);

  function updateSelectedScenario(updater: (current: AppScenarioState) => AppScenarioState) {
    setScenarioStates((current) => {
      const next = [...current] as [AppScenarioState, AppScenarioState];
      next[selectedScenarioIndex] = updater(current[selectedScenarioIndex]);
      return next;
    });
  }

  function handleAddCatalog() {
    const override = parsePositiveNumber(caffeineOverrideMg);
    updateSelectedScenario((current) => addCatalogIntake(current, catalogId, fromLocalInputValue(consumedAt), override));
    setNotice(`${selectedCoffee?.name ?? 'Coffee'} added to ${selectedScenarioLabel}. You can override caffeine values whenever your source differs.`);
  }

  function handleAddManual() {
    const caffeineMg = parsePositiveNumber(manualMg);
    if (!caffeineMg) {
      setNotice('Enter a positive caffeine amount before adding manual coffee.');
      return;
    }
    updateSelectedScenario((current) => addManualIntake(current, manualLabel, caffeineMg, fromLocalInputValue(consumedAt)));
    setNotice(`Manual caffeine entry added to ${selectedScenarioLabel}.`);
  }

  function handleShare() {
    let nextShareUrl: string;
    try {
      nextShareUrl = createShareUrl(selectedState);
    } catch (error) {
      setNotice(error instanceof Error ? `Share link could not be created: ${error.message}` : 'Share link could not be created.');
      return;
    }
    setShareUrl(nextShareUrl);

    if (!navigator.clipboard) {
      setNotice('Share link created. Copy it manually below; sensitive local-only flags were excluded.');
      return;
    }

    void navigator.clipboard
      .writeText(nextShareUrl)
      .then(() => setNotice('Share link copied. Sensitive local-only flags were excluded.'))
      .catch(() => setNotice('Share link created, but clipboard copy was blocked. Copy it manually below.'));
  }

  function handleReset() {
    updateSelectedScenario(() => createDefaultScenarioState());
    setShareUrl('');
    setNotice('Scenario reset locally.');
  }

  return (
    <main className="app-shell">
      <section className="hero-card" aria-labelledby="app-title">
        <p className="eyebrow">Caffeine PK planner</p>
        <h1 id="app-title">Plan coffee timing with transparent estimates.</h1>
        <p className="hero-copy">
          Compare explicit Scenario 1 and Scenario 2 curves. Choose a focused Vertuo seed, override caffeine manually, or enter any coffee. Profile details stay
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
          <fieldset className="scenario-picker" aria-label="Scenario to edit">
            <legend>Scenario to edit</legend>
            <label className="radio-line">
              <input
                type="radio"
                name="selected-scenario"
                checked={selectedScenarioIndex === 0}
                onChange={() => setSelectedScenarioIndex(0)}
              />
              Scenario 1
            </label>
            <label className="radio-line">
              <input
                type="radio"
                name="selected-scenario"
                checked={selectedScenarioIndex === 1}
                onChange={() => setSelectedScenarioIndex(1)}
              />
              Scenario 2
            </label>
          </fieldset>
          <label>
            Weight (kg)
            <input
              type="number"
              min="25"
              max="250"
              value={selectedState.profile.weightKg}
              onChange={(event) => {
                const weightKg = parsePositiveNumber(event.target.value);
                if (!weightKg) return;
                if (weightKg < 25 || weightKg > 250) {
                  setNotice('Weight must stay between 25 and 250 kg.');
                  return;
                }
                updateSelectedScenario((current) => updateProfile(current, { weightKg }));
              }}
            />
          </label>
          <label>
            Sensitivity
            <select
              value={selectedState.profile.sensitivity ?? 'typical'}
              onChange={(event) => updateSelectedScenario((current) => updateProfile(current, { sensitivity: event.target.value as AppScenarioState['profile']['sensitivity'] }))}
            >
              <option value="low">Low</option>
              <option value="typical">Typical</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Smoking flag (local only)
            <select
              value={selectedState.profile.smokingStatus ?? 'non-smoker'}
              onChange={(event) => updateSelectedScenario((current) => updateProfile(current, { smokingStatus: event.target.value as AppScenarioState['profile']['smokingStatus'] }))}
            >
              <option value="non-smoker">Non-smoker</option>
              <option value="smoker">Smoker</option>
            </select>
          </label>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={Boolean(selectedState.profile.takesOralContraceptives)}
              onChange={(event) => updateSelectedScenario((current) => updateProfile(current, { takesOralContraceptives: event.target.checked }))}
            />
            Oral contraceptive flag (local only)
          </label>
          <label>
            Pregnancy/postpartum flag (local only)
            <select
              value={selectedState.profile.pregnancyStatus ?? 'not-pregnant'}
              onChange={(event) => updateSelectedScenario((current) => updateProfile(current, { pregnancyStatus: event.target.value as AppScenarioState['profile']['pregnancyStatus'] }))}
            >
              <option value="not-pregnant">Not pregnant</option>
              <option value="pregnant-or-postpartum">Pregnant/postpartum</option>
              <option value="unspecified">Prefer not to say</option>
            </select>
          </label>
        </form>

        <form className="foundation-card control-panel" onSubmit={(event) => event.preventDefault()}>
          <h2>Add coffee to {selectedScenarioLabel}</h2>
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
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={showCandidatePreview}
              onChange={(event) => setShowCandidatePreview(event.target.checked)}
            />
            Preview selected coffee on graph before adding
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
          <h2>{selectedScenarioLabel}</h2>
          <p className="fine-print">{SHARE_LABEL_PRIVACY_WARNING}</p>
          {selectedState.intakes.length === 0 ? (
            <p>No caffeine intakes yet. Add a Vertuo seed or manual coffee to start.</p>
          ) : (
            <ul className="intake-list">
              {selectedState.intakes.map((intake) => (
                <li key={intake.id}>
                  <span>{intake.label}</span>
                  <strong>{intake.caffeineMg} mg</strong>
                  <time>{new Date(intake.consumedAt).toLocaleString()}</time>
                  <button type="button" className="ghost-button" onClick={() => updateSelectedScenario((current) => removeIntake(current, intake.id))}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="inline-control">
            Bedtime marker
            <input type="datetime-local" value={toLocalInputValue(new Date(selectedState.sleep.bedtime))} onChange={(event) => updateSelectedScenario((current) => updateSleepSettings(current, { bedtime: fromLocalInputValue(event.target.value).toISOString() }))} />
          </label>
          <label className="inline-control">
            Sleep target threshold (mg/L)
            <input type="number" min="0.1" step="0.1" value={selectedState.sleep.thresholdMgPerL} onChange={(event) => {
              const thresholdMgPerL = parsePositiveNumber(event.target.value);
              if (thresholdMgPerL) updateSelectedScenario((current) => updateSleepSettings(current, { thresholdMgPerL }));
            }} />
          </label>
          <div className="metric-row">
            <span>Estimated half-life</span>
            <strong>{Math.round(preview.parameters.halfLifeMinutes)} min</strong>
          </div>
          <div className="metric-row">
            <span>Preview at +36h</span>
            <strong>{latestPoint ? latestPoint.concentrationMgPerL.toFixed(2) : '0.00'} mg/L</strong>
          </div>
          <button type="button" onClick={handleShare}>Create local share link</button>
          <button type="button" className="ghost-button" onClick={handleReset}>Reset</button>
          {shareUrl ? <textarea readOnly aria-label="Share URL" value={shareUrl} /> : null}
        </section>
      </section>

      <CaffeineGraph series={graphSeries} bedtime={new Date(selectedState.sleep.bedtime)} thresholdMgPerL={threshold} />

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
