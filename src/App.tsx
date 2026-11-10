import { useEffect, useMemo, useState } from 'react';
import {
  CURATED_COFFEE_CATALOG,
  doseGroupKorean,
  findCatalogItem,
  getCatalogBrands,
  getCatalogProducts,
  getCatalogSystems,
} from './catalog/vertuo';
import { CaffeineGraph, type GraphSeries } from './components/CaffeineGraph';
import { concentrationAt, simulateScenario } from './domain';
import {
  DRINK_PRESETS,
  bedtimeVerdict,
  firstDropBelow,
  formatConcentration,
  formatKoreanWhen,
} from './planner';
import {
  activeBedtimeClock,
  addCatalogIntake,
  addManualIntake,
  isClockTime,
  loadScenarioState,
  nextClockTime,
  removeIntake,
  saveScenarioState,
  toScenario,
  updateProfile,
  updateSleepSettings,
  type AppScenarioState,
} from './state';
import './styles/tokens.css';
import './styles/global.css';

function DrinkMark({ id }: { id: string }) {
  const shared = {
    viewBox: '0 0 24 24',
    width: 18,
    height: 18,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'chip-mark',
  };
  if (id === 'espresso') {
    return <svg {...shared}><path d="M9 9h5.2v5.2a2.6 2.6 0 0 1-5.2 0V9z" /><path d="M14.2 10.4h1.6a1.4 1.4 0 0 1 0 2.8h-1.6" /><path d="M7.5 18.5h8" /></svg>;
  }
  if (id === 'cold-brew') {
    return <svg {...shared}><path d="M8.5 6.5h7v12.2a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V6.5z" /><path d="M8.5 10.5h7" /></svg>;
  }
  if (id === 'latte') {
    return <svg {...shared}><path d="M7.5 8h7.2v8.2a3.2 3.2 0 0 1-6.4 0V8z" /><path d="M14.7 10h1.8a1.6 1.6 0 0 1 0 3.2h-1.8" /><path d="M8.4 11.2h5.2" /></svg>;
  }
  if (id === 'energy') {
    return <svg {...shared}><path d="M9 4.5h6l-.6 15H9.6L9 4.5z" /><path d="M9.4 9h5.2" /></svg>;
  }
  if (id === 'green-tea') {
    return <svg {...shared}><path d="M5 15.5c3.2-6 7.2-8 14-8-1.2 6.4-5.2 10-10.4 10C6.6 17.5 5.4 16.6 5 15.5z" /><path d="M12 13.2c.4-2.2 1.6-3.8 3.4-4.8" /></svg>;
  }
  if (id === 'custom') {
    return <svg {...shared}><circle cx="12" cy="12" r="7" /><path d="M12 8.5v7M8.5 12h7" /></svg>;
  }
  const tall = id === 'americano-grande';
  return <svg {...shared}><path d={tall ? 'M7 6.5h8v10.2a3.4 3.4 0 0 1-6.8 0V6.5z' : 'M8 8h7v8.4a3 3 0 0 1-6 0V8z'} /><path d={tall ? 'M15 8.4h2.1a1.8 1.8 0 0 1 0 3.6H15' : 'M15 10h1.8a1.5 1.5 0 0 1 0 3H15'} /></svg>;
}

function toLocalInputValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function App() {
  const initialState = useMemo(() => loadScenarioState().state, []);
  const [state, setState] = useState<AppScenarioState>(initialState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [capsulesOpen, setCapsulesOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMg, setCustomMg] = useState('');
  const [consumedAt, setConsumedAt] = useState(() => new Date());
  const [lastPresetId, setLastPresetId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [weightDraft, setWeightDraft] = useState(String(initialState.profile.weightKg));
  const [catalogBrand, setCatalogBrand] = useState(CURATED_COFFEE_CATALOG[0].brand);
  const [catalogSystem, setCatalogSystem] = useState(CURATED_COFFEE_CATALOG[0].system);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogId, setCatalogId] = useState(CURATED_COFFEE_CATALOG[0].id);

  useEffect(() => {
    const saved = saveScenarioState(state);
    if (!saved.ok) setNotice('이 브라우저에 저장하지 못했습니다. 기록은 이 화면에만 남아 있습니다.');
  }, [state]);

  useEffect(() => {
    setWeightDraft(String(state.profile.weightKg));
  }, [state.profile.weightKg]);

  const catalogBrands = useMemo(() => getCatalogBrands(), []);
  const catalogSystems = useMemo(() => getCatalogSystems(catalogBrand), [catalogBrand]);
  const filteredCatalog = useMemo(
    () => getCatalogProducts(catalogBrand, catalogSystem, catalogSearch),
    [catalogBrand, catalogSystem, catalogSearch],
  );

  useEffect(() => {
    const systems = getCatalogSystems(catalogBrand);
    if (systems[0] && !systems.includes(catalogSystem)) setCatalogSystem(systems[0]);
  }, [catalogBrand, catalogSystem]);

  useEffect(() => {
    if (filteredCatalog.some((coffee) => coffee.id === catalogId)) return;
    const fallback = filteredCatalog[0] ?? CURATED_COFFEE_CATALOG[0];
    setCatalogId(fallback.id);
  }, [catalogBrand, catalogId, catalogSystem, filteredCatalog]);

  const minuteNow = Math.floor(Date.now() / 60_000) * 60_000;
  const now = useMemo(() => new Date(minuteNow), [minuteNow]);
  const clock = activeBedtimeClock(state.sleep);
  const bedtime = useMemo(() => nextClockTime(now, clock), [now, clock]);
  const reference = state.sleep.referenceLineMgPerL ?? 0.7;
  const log = state.scenarios[0];
  const scenario = useMemo(() => toScenario(state, log.id), [state, log.id]);
  const window = useMemo(() => {
    const doseTimes = scenario.intakes.map((intake) => intake.consumedAt.getTime());
    const startMs = Math.min(now.getTime(), ...(doseTimes.length ? doseTimes : [now.getTime()]));
    let endMs = startMs + 24 * 60 * 60_000;
    if (bedtime.getTime() + 6 * 60 * 60_000 > endMs) endMs = bedtime.getTime() + 6 * 60 * 60_000;
    const lastDose = doseTimes.length ? Math.max(...doseTimes) : startMs;
    if (lastDose + 18 * 60 * 60_000 > endMs) endMs = lastDose + 18 * 60 * 60_000;
    return { startAt: new Date(startMs), endAt: new Date(endMs) };
  }, [scenario.intakes, now, bedtime]);
  const simulation = useMemo(
    () => simulateScenario(scenario, { startAt: window.startAt, endAt: window.endAt, stepMinutes: 1 }),
    [scenario, window.startAt, window.endAt],
  );
  const hasDoses = scenario.intakes.length > 0;
  const currentMg = hasDoses ? concentrationAt(state.profile, scenario.intakes, now).concentrationMgPerL : null;
  const bedtimeMg = hasDoses ? concentrationAt(state.profile, scenario.intakes, bedtime).concentrationMgPerL : null;
  const verdict = bedtimeMg === null ? null : bedtimeVerdict(bedtimeMg, reference);
  const drop = currentMg === null ? null : firstDropBelow(simulation.points, now, reference);
  const graphSeries: GraphSeries[] = [{
    id: log.id,
    label: '오늘',
    points: simulation.points,
    tone: 'gold',
  }];
  const doses = scenario.intakes.map((intake) => ({
    id: intake.id,
    label: intake.label,
    consumedAt: intake.consumedAt,
  }));
  const listed = [...log.intakes].sort((a, b) => new Date(b.consumedAt).getTime() - new Date(a.consumedAt).getTime());
  const nearNow = Math.abs(consumedAt.getTime() - Date.now()) < 60_000;
  const selectedCoffee = findCatalogItem(catalogId);

  function commitWeight() {
    if (weightDraft.trim() === '') {
      setNotice('체중을 25–250 kg로 입력해 주세요. 마지막 저장 값을 유지했습니다.');
      setWeightDraft(String(state.profile.weightKg));
      return;
    }
    const weightKg = Number(weightDraft);
    if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 250) {
      setNotice('체중은 25–250 kg 사이여야 합니다. 마지막 저장 값을 유지했습니다.');
      setWeightDraft(String(state.profile.weightKg));
      return;
    }
    setNotice('');
    setState((current) => updateProfile(current, { weightKg }));
  }

  function setBedtimeClock(value: string) {
    if (!isClockTime(value)) return;
    setState((current) => updateSleepSettings(current, {
      bedtimeClock: value,
      bedtime: nextClockTime(new Date(), value).toISOString(),
    }));
  }

  function addPreset(presetId: string, label: string, caffeineMg: number) {
    setState((current) => addManualIntake(current, log.id, label, caffeineMg, consumedAt));
    setLastPresetId(presetId);
    setNotice('');
  }

  function addCustom() {
    const caffeineMg = parsePositiveNumber(customMg);
    if (!caffeineMg) {
      setNotice('직접 입력하려면 카페인 mg를 적어 주세요.');
      return;
    }
    setState((current) => addManualIntake(current, log.id, customName.trim() || '직접 입력', caffeineMg, consumedAt));
    setCustomMg('');
    setCustomName('');
    setLastPresetId('custom');
    setNotice('');
  }

  function addCapsule() {
    if (!selectedCoffee) return;
    setState((current) => addCatalogIntake(current, log.id, catalogId, consumedAt));
    setLastPresetId(null);
    setNotice('');
  }

  function shiftTime(minutes: number) {
    setConsumedAt((current) => new Date(current.getTime() + minutes * 60_000));
  }

  const dropText = !hasDoses
    ? '기록 없음'
    : drop === 'below'
      ? '이미 참고선 아래'
      : drop === 'above-through-window'
        ? '이 구간 안에도 참고선 위'
        : formatKoreanWhen(drop ?? now, now);

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>카페인 타이머</h1>
          <p className="lede">지금 마신 것을 누르면 바로 기록됩니다. 체중과 민감도는 설정에 한 번만 둡니다.</p>
        </div>
        <button
          type="button"
          className="settings-toggle"
          aria-expanded={settingsOpen}
          aria-controls="settings-panel"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          설정
        </button>
      </header>

      {settingsOpen ? (
        <section className="panel" id="settings-panel" aria-label="설정">
          <h2>설정</h2>
          <p className="hint">이 기기에만 저장됩니다. 기본값으로 바로 쓸 수 있습니다.</p>
          <div className="settings-row">
            <label htmlFor="weight-kg">체중</label>
            <span>
              <input
                id="weight-kg"
                inputMode="decimal"
                value={weightDraft}
                onChange={(event) => setWeightDraft(event.target.value)}
                onBlur={commitWeight}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitWeight();
                }}
              />
              {' '}kg
            </span>
          </div>
          <label className="settings-row">
            민감도
            <select
              aria-label="민감도"
              value={state.profile.sensitivity ?? 'typical'}
              onChange={(event) => setState((current) => updateProfile(current, { sensitivity: event.target.value as AppScenarioState['profile']['sensitivity'] }))}
            >
              <option value="low">낮음</option>
              <option value="typical">보통</option>
              <option value="high">높음</option>
            </select>
          </label>
          <label className="settings-row">
            흡연
            <select
              aria-label="흡연"
              value={state.profile.smokingStatus ?? 'non-smoker'}
              onChange={(event) => setState((current) => updateProfile(current, { smokingStatus: event.target.value as AppScenarioState['profile']['smokingStatus'] }))}
            >
              <option value="non-smoker">아니오</option>
              <option value="smoker">예</option>
            </select>
          </label>
          <label className="settings-row">
            임신·산후
            <select
              aria-label="임신·산후"
              value={state.profile.pregnancyStatus ?? 'not-pregnant'}
              onChange={(event) => setState((current) => updateProfile(current, { pregnancyStatus: event.target.value as AppScenarioState['profile']['pregnancyStatus'] }))}
            >
              <option value="not-pregnant">해당 없음</option>
              <option value="pregnant-or-postpartum">임신·산후</option>
              <option value="unspecified">말하지 않음</option>
            </select>
          </label>
          <label className="settings-row">
            경구피임약
            <span className="settings-check">
              <input
                type="checkbox"
                checked={Boolean(state.profile.takesOralContraceptives)}
                onChange={(event) => setState((current) => updateProfile(current, { takesOralContraceptives: event.target.checked }))}
              />
              {state.profile.takesOralContraceptives ? '예' : '아니오'}
            </span>
          </label>
          <label className="settings-row">
            취침 시각
            <input
              aria-label="취침 시각"
              type="time"
              value={clock}
              onChange={(event) => setBedtimeClock(event.target.value)}
            />
          </label>
          <label className="settings-row">
            참고선
            <input
              aria-label="참고선"
              type="number"
              min="0.1"
              step="0.1"
              value={reference}
              onChange={(event) => {
                const referenceLineMgPerL = parsePositiveNumber(event.target.value);
                if (referenceLineMgPerL && referenceLineMgPerL <= 10) {
                  setState((current) => updateSleepSettings(current, { referenceLineMgPerL }));
                }
              }}
            />
          </label>
        </section>
      ) : null}

      <p className="reference-note">용량은 참고값입니다.</p>
      <div className="chips" aria-label="한 번에 기록">
        {DRINK_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="chip"
            aria-label={`${preset.label} ${preset.caffeineMg} mg`}
            aria-pressed={lastPresetId === preset.id}
            onClick={() => addPreset(preset.id, preset.label, preset.caffeineMg)}
          >
            <DrinkMark id={preset.id} />
            <span className="chip-text">
              <span className="chip-name">{preset.label}</span>
              <span className="chip-mg"> {preset.caffeineMg} mg</span>
            </span>
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={customOpen} aria-expanded={customOpen} onClick={() => setCustomOpen((open) => !open)}>
          <DrinkMark id="custom" />
          <span className="chip-text">
            <span className="chip-name">직접 입력</span>
          </span>
        </button>
      </div>

      {customOpen ? (
        <form
          className="custom-entry"
          onSubmit={(event) => {
            event.preventDefault();
            addCustom();
          }}
        >
          <label>
            이름 (선택)
            <input value={customName} maxLength={80} placeholder="예: 디카페인" onChange={(event) => setCustomName(event.target.value)} />
          </label>
          <label>
            카페인 (mg)
            <input type="number" min="1" inputMode="decimal" value={customMg} onChange={(event) => setCustomMg(event.target.value)} />
          </label>
          <button type="submit" className="solid-button">추가</button>
        </form>
      ) : null}

      <div className="time-row">
        <label className="time-field">
          시각
          <input
            type="datetime-local"
            value={toLocalInputValue(consumedAt)}
            onChange={(event) => setConsumedAt(fromLocalInputValue(event.target.value))}
          />
        </label>
        {nearNow ? <strong className="now-flag">지금</strong> : null}
        <button type="button" className="time-shift" onClick={() => shiftTime(-30)}>−30분</button>
        <button type="button" className="time-shift" onClick={() => shiftTime(-15)}>−15분</button>
        <button type="button" className="time-shift" onClick={() => shiftTime(15)}>+15분</button>
      </div>

      {notice ? <p className="notice" role="status">{notice}</p> : null}

      <section className="summary" aria-label="요약">
        <article className="summary-card summary-hero" aria-label="현재 체내 농도">
          <p>현재 체내 농도</p>
          <strong>{currentMg === null ? '기록 없음' : formatConcentration(currentMg)}</strong>
          {currentMg !== null && currentMg < 0.05 ? <span className="hint">방금 마신 양은 아직 거의 흡수되지 않았습니다.</span> : null}
        </article>
        <article className="summary-card" aria-label="참고선 아래">
          <p>참고선 {reference.toFixed(1)} mg/L 아래</p>
          <strong>{dropText}</strong>
        </article>
        <article className={`summary-card summary-verdict${verdict === '주의' ? ' caution' : ''}`} aria-label="취침 판정">
          <p>취침 {clock}</p>
          <strong>{verdict ? `취침 ${clock}이면 ${verdict}` : '기록 없음'}</strong>
          {bedtimeMg !== null ? <span className="hint">취침 때 약 {bedtimeMg.toFixed(1)} mg/L</span> : null}
        </article>
      </section>

      <ul className="dose-list" aria-label="오늘 기록">
        {listed.length === 0 ? <li className="empty">아직 기록이 없습니다.</li> : listed.map((intake) => (
          <li key={intake.id}>
            <span>{formatKoreanWhen(new Date(intake.consumedAt), now)} {intake.label}</span>
            <span>
              {intake.caffeineMg} mg
              {' · '}
              <button type="button" className="delete-button" onClick={() => setState((current) => removeIntake(current, log.id, intake.id))}>
                지우기
              </button>
            </span>
          </li>
        ))}
      </ul>

      <CaffeineGraph series={graphSeries} bedtime={bedtime} referenceLineMgPerL={reference} doses={doses} />

      <section className="disclosure">
        <button type="button" className="quiet-button" aria-expanded={capsulesOpen} onClick={() => setCapsulesOpen((open) => !open)}>
          캡슐 더보기
        </button>
        {capsulesOpen ? (
          <form
            className="capsule-fields"
            aria-label="캡슐 더보기"
            onSubmit={(event) => {
              event.preventDefault();
              addCapsule();
            }}
          >
            <label>
              회사
              <select value={catalogBrand} onChange={(event) => setCatalogBrand(event.target.value as typeof catalogBrand)}>
                {catalogBrands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </label>
            <label>
              캡슐 시스템
              <select value={catalogSystem} onChange={(event) => setCatalogSystem(event.target.value as typeof catalogSystem)}>
                {catalogSystems.map((system) => <option key={system} value={system}>{system}</option>)}
              </select>
            </label>
            <label>
              제품 검색
              <input value={catalogSearch} placeholder="디카페인, 멜로지오" onChange={(event) => setCatalogSearch(event.target.value)} />
            </label>
            <label>
              제품
              <select value={catalogId} onChange={(event) => setCatalogId(event.target.value)}>
                {filteredCatalog.map((coffee) => (
                  <option key={coffee.id} value={coffee.id}>
                    {coffee.name} · {coffee.caffeineMg} mg · {doseGroupKorean(coffee.doseGroup)}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">캡슐 용량도 참고값입니다. 시장과 배치에 따라 달라질 수 있습니다.</p>
            <button type="submit" className="solid-button">이 캡슐 추가</button>
          </form>
        ) : null}
      </section>

      <p className="disclaimer">
        교육용 추정치이며 의학적 조언이 아닙니다. 진단이나 치료도 아니며, 개인 대사는 크게 다를 수 있습니다. 표시된 mg는 계획용 참고값입니다. 건강이 걱정되면 전문가와 상의하세요.
      </p>
    </main>
  );
}
