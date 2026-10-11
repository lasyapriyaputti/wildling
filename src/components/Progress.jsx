import React, { useMemo, useState } from 'react';
import { useApp } from '../context.js';
import { BADGES } from '../lib/badges.js';
import { pad, daysInMonth } from '../lib/dates.js';
import { MONTHLY_GOAL } from '../lib/stats.js';
import { MILESTONES } from '../lib/streak.js';
import ShareButton from './ShareButton.jsx';

export default function Progress() {
  const { stats, earnedIds, title, observations } = useApp();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const s = stats.streak;
  const next = s.nextMilestone;
  const prev = [...MILESTONES].reverse().find((m) => m <= s.current) || 0;
  const pct = next ? ((s.current - prev) / (next - prev)) * 100 : 100;
  const lastObs = observations.find((o) => o.counts);

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1).getDay();
    const n = daysInMonth(cursor.y, cursor.m);
    const arr = Array(first).fill(null);
    for (let d = 1; d <= n; d++) arr.push(`${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`);
    return arr;
  }, [cursor]);
  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const shift = (d) => setCursor((c) => { const t = new Date(c.y, c.m + d, 1); return { y: t.getFullYear(), m: t.getMonth() }; });
  const groups = [...new Set(BADGES.map((b) => b.group))];

  return (
    <div className="stack">
      <h2>Progress</h2>
      <section className="card">
        <div className="grid2">
          <div className="stat"><div className="stat-num">{s.current} 🔥</div><div className="stat-label">current streak</div></div>
          <div className="stat"><div className="stat-num">{s.longest}</div><div className="stat-label">longest streak</div></div>
        </div>
        {next && <>
          <div className="progress"><span style={{ width: pct + '%' }} /></div>
          <p className="muted small">{next - s.current} more day{next - s.current === 1 ? '' : 's'} to the {next}-day milestone.</p>
        </>}
        <p className="muted small">A day counts when you save at least one identification the model was reasonably confident about.</p>
      </section>

      <section className="card">
        <div className="row between">
          <button className="link" onClick={() => shift(-1)}>‹</button>
          <b>{monthName}</b>
          <button className="link" onClick={() => shift(1)}>›</button>
        </div>
        <div className="cal">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="cal-h">{d}</span>)}
          {cells.map((k, i) => k ? (
            <span key={i} className={'cal-d' + (stats.activeDays.has(k) ? ' hit' : '')}>{Number(k.slice(8))}</span>
          ) : <span key={i} />)}
        </div>
      </section>

      <section className="card">
        <div className="row between"><b>Monthly challenge</b><span className="muted small">{stats.thisMonthSpecies}/{MONTHLY_GOAL}</span></div>
        <div className="progress"><span style={{ width: Math.min(100, (stats.thisMonthSpecies / MONTHLY_GOAL) * 100) + '%' }} /></div>
        <p className="muted small">Find {MONTHLY_GOAL} different species this month.</p>
      </section>

      <section>
        <div className="row between"><h3>Badges</h3><span className="muted small">Title: {title.emoji} {title.name}</span></div>
        {groups.map((g) => (
          <div key={g}>
            <div className="eyebrow">{g}</div>
            <div className="badges">
              {BADGES.filter((b) => b.group === g).map((b) => {
                const got = earnedIds.includes(b.id);
                return (
                  <div key={b.id} className={'badge' + (got ? ' got' : '')}>
                    <div className="b-emoji">{got ? b.emoji : '🔒'}</div>
                    <b>{b.name}</b>
                    <span className="muted small">{b.desc}</span>
                    {got && lastObs && <ShareButton kind="badge" badge={b} photoBlob={lastObs.thumb} species={null} label="Share" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
