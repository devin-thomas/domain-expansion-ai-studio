import React from 'react';

const ledgerRows = [
  { name: 'northstar.studio', registrar: 'Cloudflare', date: 'Sep 22, 2026', status: 'ACTIVE', tone: 'green', cost: '$10.18' },
  { name: 'orbitalsupply.co', registrar: 'Porkbun', date: 'Oct 04, 2026', status: 'ACTIVE', tone: 'green', cost: '$9.99' },
  { name: 'field-notes.dev', registrar: 'Namecheap', date: 'Oct 18, 2026', status: 'RENEW SOON', tone: 'amber', cost: '$13.48' },
];

export const ShowcaseView: React.FC = () => {
  return (
    <div className="showcase-shell">
      <header className="showcase-nav">
        <a className="showcase-mark" href="/" aria-label="Domain Expansion home">
          <span className="showcase-mark-glyph">D</span>
          <span>Domain Expansion</span>
        </a>
        <nav aria-label="Showcase navigation" className="showcase-links">
          <a href="#ledger">Ledger</a>
          <a href="#signal">Signal</a>
          <a href="#privacy">Storage</a>
          <a className="showcase-open" href="/">Open app <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <main>
        <section className="showcase-hero" aria-labelledby="showcase-title">
          <div className="hero-copy">
            <p className="hero-index">DOMAIN EXPANSION / 01</p>
            <h1 id="showcase-title">Every domain.<br /><em>Accounted for.</em></h1>
            <p className="hero-deck">A quiet control surface for the domains you own, manage, and renew.</p>
            <div className="hero-actions">
              <a className="action-primary" href="/">Open the tracker <span aria-hidden="true">→</span></a>
              <a className="action-text" href="#ledger">See the ledger</a>
            </div>
          </div>
          <div className="hero-art" aria-label="Domain renewal overview">
            <div className="art-topline"><span>RENEWAL HORIZON</span><span>Q3 / 2026</span></div>
            <div className="horizon-figure"><strong>03</strong><span>active records<br />in view</span></div>
            <div className="horizon-track"><span className="track-dot dot-one" /><span className="track-dot dot-two" /><span className="track-dot dot-three" /><span className="track-line" /></div>
            <div className="horizon-labels"><span>SEP 22</span><span>OCT 04</span><span>OCT 18</span></div>
            <div className="art-foot"><span>next renewal</span><strong>field-notes.dev</strong><span className="art-alert">14 DAYS</span></div>
          </div>
        </section>

        <section className="showcase-section ledger-section" id="ledger" aria-labelledby="ledger-title">
          <div className="section-heading"><span className="section-number">02</span><h2 id="ledger-title">The ledger</h2><span className="section-rule" /></div>
          <div className="ledger-frame">
            <div className="ledger-bar"><span>DOMAIN INVENTORY</span><span>03 RECORDS · SORTED BY RENEWAL</span></div>
            <div className="ledger-table" role="table" aria-label="Example domain inventory">
              <div className="ledger-row ledger-head" role="row"><span>Domain</span><span>Registrar</span><span>Renewal</span><span>Status</span><span>Cost</span></div>
              {ledgerRows.map((row) => (
                <div className="ledger-row" role="row" key={row.name}>
                  <strong>{row.name}</strong><span>{row.registrar}</span><time dateTime="2026-09-22">{row.date}</time><span className={`status status-${row.tone}`}>{row.status}</span><span className="cost">{row.cost}</span>
                </div>
              ))}
            </div>
            <div className="ledger-foot"><span>Renewal intention is explicit on every record.</span><a href="/">View domains <span aria-hidden="true">→</span></a></div>
          </div>
        </section>

        <section className="showcase-section split-section" id="signal" aria-labelledby="signal-title">
          <div className="signal-art" aria-hidden="true"><span className="signal-axis">DAYS</span><div className="signal-bar signal-safe"><b>30+</b><span>planned</span></div><div className="signal-bar signal-warm"><b>14</b><span>watch</span></div><div className="signal-bar signal-hot"><b>07</b><span>act</span></div></div>
          <div className="split-copy"><div className="section-heading compact"><span className="section-number">03</span><h2 id="signal-title">Signal, not noise</h2></div><p>Renewals are ordered by consequence. Costs, dates, registrars, and intent stay attached to the domain they describe.</p><a className="action-text" href="/">See the dashboard <span aria-hidden="true">→</span></a></div>
        </section>

        <section className="showcase-section privacy-section" id="privacy" aria-labelledby="privacy-title">
          <div className="privacy-copy"><div className="section-heading compact"><span className="section-number">04</span><h2 id="privacy-title">Your data stays yours</h2></div><p>Records stay in your browser until you connect Google Drive. Sync uses Drive’s private app data space; the app has no central user database.</p><a className="action-primary small" href="/">Start with local mode <span aria-hidden="true">→</span></a></div>
          <dl className="privacy-spec"><div><dt>LOCAL MODE</dt><dd>Available</dd></div><div><dt>DRIVE SYNC</dt><dd>Private app data</dd></div><div><dt>CENTRAL DB</dt><dd>None</dd></div></dl>
        </section>
      </main>
      <footer className="showcase-footer"><span>DOMAIN EXPANSION</span><span>PERSONAL MULTI-REGISTRAR TRACKING</span><a href="/">Launch app ↗</a></footer>
    </div>
  );
};
