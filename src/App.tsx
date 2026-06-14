const foundationCards = [
  {
    title: 'Static-first foundation',
    body: 'Vite, React, and TypeScript are wired for a browser-only app with no backend, login, telemetry, or cloud history.',
  },
  {
    title: 'Approximation guardrails',
    body: 'The product shell leads with estimate/range language and reserves PK calculations for a tested domain module in a later slice.',
  },
  {
    title: 'Deployment ready',
    body: 'GitHub Pages builds the static artifact from dist with a repository-aware base path.',
  },
];

export function App() {
  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="hero-card">
        <p className="eyebrow">Caffeine PK Explorer</p>
        <h1 id="app-title">Plan coffee timing with transparent, non-medical estimates.</h1>
        <p className="hero-copy">
          A premium static-web foundation for exploring approximate residual caffeine over time. This scaffold intentionally stops before the PK engine, catalog, persistence, share links, and graph UX.
        </p>
        <div className="hero-actions" aria-label="Foundation status">
          <span className="status-pill">React + TypeScript</span>
          <span className="status-pill">Static deploy</span>
          <span className="status-pill">Local-first v1</span>
        </div>
      </section>

      <section className="foundation-grid" aria-label="Foundation capabilities">
        {foundationCards.map((card) => (
          <article className="foundation-card" key={card.title}>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className="assumption-panel" aria-labelledby="assumption-title">
        <h2 id="assumption-title">Model and safety copy placeholder</h2>
        <p>
          Future calculations must be labeled as estimates with visible assumptions and uncertainty. This app does not provide medical advice, diagnosis, or treatment guidance.
        </p>
      </section>
    </main>
  );
}
