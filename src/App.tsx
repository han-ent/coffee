import { useEffect, useMemo, useState } from 'react';
import { CaffeineGraph, type GraphSeries } from './components/CaffeineGraph';
import { VERTUO_SEED_CATALOG, findCatalogItem } from './catalog/vertuo';
import { concentrationAt, simulateScenario } from './domain';
import {
  SHARE_LABEL_PRIVACY_WARNING,
  addCatalogIntake,
  addManualIntake,
  clearScenario,
  copyScenario,
  createDefaultScenarioState,
  createShareUrl,
  getScenarioState,
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

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 0) return 'No caffeine yet';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

export function App() {
  const initialLoad = useMemo(() => {
    const shared = loadShareFromUrl();
    if (shared.ok) return { state: shared.state, notice: shared.warning ?? 'Shared scenario loaded.' };
    const stored = loadScenarioState();
    return { state: stored.state, notice: stored.ok ? '' : `Local data reset: ${stored.error}` };
  }, []);

  const [state, setState] = useState<AppScenarioState>(initialLoad.state);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<0 | 1>(0);
  const [notice, setNotice] = useState(initialLoad.notice);
  const [catalogId, setCatalogId] = useState(VERTUO_SEED_CATALOG[0].id);
  const [targetScenarioId, setTargetScenarioId] = useState('scenario-1');
  const [caffeineOverrideMg, setCaffeineOverrideMg] = useState('');
  const [manualLabel, setManualLabel] = useState('My coffee');
  const [manualMg, setManualMg] = useState('120');
  const [consumedAt, setConsumedAt] = useState(toLocalInputValue(new Date()));
  const [shareUrl, setShareUrl] = useState('');
  const [weightDraft, setWeightDraft] = useState(String(initialLoad.state.profile.weightKg));

  const selectedState = scenarioStates[selectedScenarioIndex];
  const selectedScenarioLabel = selectedScenarioIndex === 0 ? 'Scenario 1' : 'Scenario 2';

  useEffect(() => {
    saveScenarioState(scenarioStates[0]);
  }, [scenarioStates]);

  useEffect(() => {
    setWeightDraft(String(state.profile.weightKg));
  }, [state.profile.weightKg]);

  const selectedScenarioLabel = state.scenarios[selectedScenarioIndex]?.name ?? `Scenario ${selectedScenarioIndex + 1}`;
  const targetScenarioName = getScenarioState(state, targetScenarioId).name;
  const selectedCoffee = findCatalogItem(catalogId);
  const scenarioModels = useMemo(() => state.scenarios.map((scenario) => toScenario(state, scenario.id)), [state]);
  const allIntakeDates = useMemo(
    () => state.scenarios.flatMap((scenario) => scenario.intakes.map((intake) => new Date(intake.consumedAt).getTime())),
    [state.scenarios],
  );
  const startAt = useMemo(() => allIntakeDates.length ? new Date(Math.min(...allIntakeDates)) : new Date(), [allIntakeDates]);
  const endAt = useMemo(() => new Date(startAt.getTime() + 36 * 60 * 60_000), [startAt]);
  const referenceLine = state.sleep.referenceLineMgPerL ?? 0.7;
  const simulations = useMemo(
    () => scenarioModels.map((scenario) => simulateScenario(scenario, { startAt, endAt, stepMinutes: 1 })),
    [scenarioModels, startAt, endAt],
  );
  const graphSeries: GraphSeries[] = useMemo(() => simulations.map((simulation, index) => ({
    id: state.scenarios[index]?.id ?? `scenario-${index + 1}`,
    label: state.scenarios[index]?.name ?? `Scenario ${index + 1}`,
    points: simulation.points,
    tone: index === 0 ? 'gold' : 'blue',
  })), [simulations, state.scenarios]);
  const bedtime = new Date(state.sleep.bedtime);
  const bedtimeResiduals = scenarioModels.map((scenario) => concentrationAt(state.profile, scenario.intakes, bedtime));
  const latestIntakeTime = Math.max(...allIntakeDates, Number.NaN);
  const minutesSinceLastCaffeineAtBedtime = Number.isFinite(latestIntakeTime) ? (bedtime.getTime() - latestIntakeTime) / 60_000 : Number.NaN;

  function commitWeight() {
    if (weightDraft.trim() === '') {
      setNotice('Enter a weight between 25 and 250 kg. Last saved profile was preserved.');
      setWeightDraft(String(state.profile.weightKg));
      return;
    }
    const weightKg = Number(weightDraft);
    if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 250) {
      setNotice('Weight must stay between 25 and 250 kg. Last saved profile was preserved.');
      setWeightDraft(String(state.profile.weightKg));
      return;
    }
    setState((current) => updateProfile(current, { weightKg }));
  }

  function updateSelectedScenario(updater: (current: AppScenarioState) => AppScenarioState) {
    setState((current) => updater(current));
  }

  function updateSelectedScenario(updater: (current: AppScenarioState) => AppScenarioState) {
    setScenarioStates((current) => {
      const next = [...current] as [AppScenarioState, AppScenarioState];
      next[selectedScenarioIndex] = updater(current[selectedScenarioIndex]);
      return next;
    });
  }

  function handleAddCatalog() {
    const override = parsePositiveNumber(caffeineOverrideMg);
    setState((current) => addCatalogIntake(current, targetScenarioId, catalogId, fromLocalInputValue(consumedAt), override));
    setNotice(`${selectedCoffee?.name ?? 'Coffee'} added to ${targetScenarioName}. Manual caffeine overrides remain local-first.`);
  }

  function handleAddManual() {
    const caffeineMg = parsePositiveNumber(manualMg);
    if (!caffeineMg) {
      setNotice('Enter a positive caffeine amount before adding manual coffee.');
      return;
    }
    setState((current) => addManualIntake(current, targetScenarioId, manualLabel, caffeineMg, fromLocalInputValue(consumedAt)));
    setNotice(`Manual caffeine entry added to ${targetScenarioName}.`);
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
    setNotice('Scenarios reset locally.');
  }

  return (
    <main className="app-shell">
      <section className="hero-card" aria-labelledby="app-title">
        <p className="eyebrow">Caffeine PK planner</p>
        <h1 id="app-title">Compare coffee timing with transparent scenarios.</h1>
        <p className="hero-copy">
          Build Scenario 1 and Scenario 2 explicitly, override caffeine manually, or enter any coffee. Profile details stay
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
                onChange={() => {
                  setSelectedScenarioIndex(0);
                  setTargetScenarioId('scenario-1');
                }}
              />
              Scenario 1
            </label>
            <label className="radio-line">
              <input
                type="radio"
                name="selected-scenario"
                checked={selectedScenarioIndex === 1}
                onChange={() => {
                  setSelectedScenarioIndex(1);
                  setTargetScenarioId('scenario-2');
                }}
              />
              Scenario 2
            </label>
          </fieldset>
          <label>
            Weight (kg)
            <input
              type="text"
              inputMode="decimal"
              value={weightDraft}
              onChange={(event) => setWeightDraft(event.target.value)}
              onBlur={commitWeight}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitWeight();
              }}
            />
          </label>
          <p className="fine-print">Type freely, then leave the field to commit a value from 25–250 kg.</p>
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
          <h2>Add coffee to {targetScenarioName}</h2>
          <label>
            Add to scenario
            <select value={targetScenarioId} onChange={(event) => setTargetScenarioId(event.target.value)}>
              {state.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
            </select>
          </label>
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
          <h2>Scenarios</h2>
          <p className="fine-print">{SHARE_LABEL_PRIVACY_WARNING}</p>
          <div className="hero-actions" aria-label="Scenario actions">
            <button type="button" className="secondary-button" onClick={() => setState((current) => copyScenario(current, 'scenario-1', 'scenario-2'))}>Copy Scenario 1 to Scenario 2</button>
            <button type="button" className="ghost-button" onClick={() => setState((current) => clearScenario(current, 'scenario-2'))}>Clear Scenario 2</button>
          </div>
          {state.scenarios.map((scenario) => (
            <section key={scenario.id} aria-label={scenario.name}>
              <h3>{scenario.name}</h3>
              {scenario.intakes.length === 0 ? (
                <p>No caffeine intakes yet.</p>
              ) : (
                <ul className="intake-list">
                  {scenario.intakes.map((intake) => (
                    <li key={intake.id}>
                      <span>{intake.label}</span>
                      <strong>{intake.caffeineMg} mg</strong>
                      <time>{new Date(intake.consumedAt).toLocaleString()}</time>
                      <button type="button" className="ghost-button" onClick={() => setState((current) => removeIntake(current, scenario.id, intake.id))}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <label className="inline-control">
            Bedtime marker
            <input type="datetime-local" value={toLocalInputValue(new Date(state.sleep.bedtime))} onChange={(event) => updateSelectedScenario((current) => updateSleepSettings(current, { bedtime: fromLocalInputValue(event.target.value).toISOString() }))} />
          </label>
          <label className="inline-control">
            Custom reference line (mg/L)
            <input type="number" min="0.1" step="0.1" value={referenceLine} onChange={(event) => {
              const referenceLineMgPerL = parsePositiveNumber(event.target.value);
              if (referenceLineMgPerL) setState((current) => updateSleepSettings(current, { referenceLineMgPerL }));
            }} />
          </label>
          <p className="fine-print">The reference line is a personal planning marker, not a medical safety threshold.</p>
          <div className="metric-row">
            <span>At bedtime · Scenario 1</span>
            <strong>{bedtimeResiduals[0]?.concentrationMgPerL.toFixed(2) ?? '0.00'} mg/L</strong>
          </div>
          <div className="metric-row">
            <span>At bedtime · Scenario 2</span>
            <strong>{bedtimeResiduals[1]?.concentrationMgPerL.toFixed(2) ?? '0.00'} mg/L</strong>
          </div>
          <div className="metric-row">
            <span>Time since last caffeine at bedtime</span>
            <strong>{formatDuration(minutesSinceLastCaffeineAtBedtime)}</strong>
          </div>
          <button type="button" onClick={handleShare}>Create local share link</button>
          <button type="button" className="ghost-button" onClick={handleReset}>Reset</button>
          {shareUrl ? <textarea readOnly aria-label="Share URL" value={shareUrl} /> : null}
        </section>
      </section>

      <CaffeineGraph series={graphSeries} bedtime={bedtime} referenceLineMgPerL={referenceLine} />

      <aside className="assumption-panel">
        <h2>Model framing</h2>
        <p>{simulations[0]?.disclaimer}</p>
        <ul>
          {simulations[0]?.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
      </aside>
    </main>
  );
}
