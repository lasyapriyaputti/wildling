import React from 'react';
import { useApp } from '../context.js';
import { MONTHLY_GOAL } from '../lib/stats.js';
import { promptForDay } from '../prompts.js';

export default function Explore({ onStart }) {
  const { stats, title, today } = useApp();
  const s = stats.streak;
  const pct = Math.min(100, (stats.thisMonthSpecies / MONTHLY_GOAL) * 100);
  return (
    <div className="stack">
      <section className="hero">
        <div className="hero-title"><span>{title.emoji}</span> {title.name}</div>
        <h1>Go touch some grass.</h1>
        <p>Find something alive, point your camera at it, and let an open-weight model on your device tell you who you met.</p>
        <button className="btn primary big" onClick={onStart}>📷 Open camera</button>
      </section>

      <section className="card quest">
        <div className="eyebrow">Today’s quest</div>
        <p className="quest-text">{promptForDay(today)}</p>
      </section>

      <section className="grid2">
        <div className="card stat">
          <div className="stat-num">{s.current}{s.current > 0 ? ' 🔥' : ''}</div>
          <div className="stat-label">day streak</div>
          <div className="muted small">{s.atRisk ? 'Find something today to keep it alive.' : s.activeToday ? 'Done for today. Nice.' : 'Start one today.'}</div>
        </div>
        <div className="card stat">
          <div className="stat-num">{stats.distinctSpecies}</div>
          <div className="stat-label">species found</div>
          <div className="muted small">{stats.totalObservations} observation{stats.totalObservations === 1 ? '' : 's'}</div>
        </div>
      </section>

      <section className="card">
        <div className="row between"><b>This month</b><span className="muted small">{stats.thisMonthSpecies}/{MONTHLY_GOAL} species</span></div>
        <div className="progress"><span style={{ width: pct + '%' }} /></div>
        <p className="muted small">Variety counts. Ten different species beat ten photos of the same one.</p>
      </section>
    </div>
  );
}
