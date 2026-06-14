import './styles/tokens.css';
import './styles/global.css';

export function App() {
  return (
    <main className="app-shell">
      <section className="hero-card" aria-labelledby="app-title">
        <p className="eyebrow">Caffeine PK foundation</p>
        <h1 id="app-title">Plan coffee timing with transparent estimates.</h1>
        <p className="hero-copy">
          Vite, React, and TypeScript are ready for the caffeine timing explorer. This
          foundation keeps the app static, private, and prepared for a premium graph-led experience.
        </p>
        <div className="hero-actions" aria-label="Foundation status">
          <span className="status-pill">Static web app</span>
          <span className="status-pill">GitHub Pages ready</span>
          <span className="status-pill">No accounts or cloud storage</span>
        </div>
      </section>

      <section className="foundation-grid" aria-label="Foundation boundaries">
        <article className="foundation-card">
          <h2>Scope guard</h2>
          <p>Intentionally stops before the PK engine, coffee catalog, persistence, and graph UX stories.</p>
        </article>
        <article className="foundation-card">
          <h2>Privacy posture</h2>
          <p>Future profile and scenario data stay local-first with serverless sharing.</p>
        </article>
        <article className="foundation-card">
          <h2>Model framing</h2>
          <p>This app does not provide medical advice; future caffeine values will be estimates with ranges.</p>
        </article>
      </section>

      <aside className="assumption-panel">
        <h2>G001 baseline</h2>
        <p>Build, test, lint, design tokens, and static deployment scaffolding are the only goals in this story.</p>
      </aside>
    </main>
  );
}
