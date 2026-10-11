import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppCtx } from './context.js';
import { db } from './lib/db.js';
import { dayKey } from './lib/dates.js';
import { buildStats } from './lib/stats.js';
import { currentTitle } from './lib/badges.js';
import { loadSpecies, readModelMeta, OnnxEngine, DemoEngine } from './lib/engine.js';
import { useOnline } from './hooks.js';
import Explore from './components/Explore.jsx';
import Camera from './components/Camera.jsx';
import Result from './components/Result.jsx';
import Collection from './components/Collection.jsx';
import Progress from './components/Progress.jsx';
import About from './components/About.jsx';
import ShareModal from './components/ShareModal.jsx';

const TABS = [
  ['explore', 'Explore', '🧭'],
  ['collection', 'Collection', '📖'],
  ['progress', 'Progress', '🔥'],
  ['about', 'About', 'ℹ️']
];

export default function App() {
  const online = useOnline();
  const [tab, setTab] = useState('explore');
  const [flow, setFlow] = useState(null); // null | {step:'camera'} | {step:'result', blob}
  const [species, setSpecies] = useState(null);
  const [model, setModel] = useState({ status: 'loading', progress: null, engine: null, error: null });
  const [share, setShare] = useState(null);
  const started = useRef(false);

  const observations = useLiveQuery(() => db.observations.orderBy('createdAt').reverse().toArray(), [], []);
  const badgeRows = useLiveQuery(() => db.badges.toArray(), [], []);
  const today = dayKey();
  const stats = useMemo(() => buildStats(observations, today), [observations, today]);
  const earnedIds = useMemo(() => badgeRows.map((b) => b.id), [badgeRows]);
  const title = useMemo(() => currentTitle(earnedIds, stats), [earnedIds, stats]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const sp = await loadSpecies();
      setSpecies(sp);
      const meta = await readModelMeta();
      if (!meta || !sp.meta.has_embeddings) {
        setModel({ status: 'demo', progress: null, engine: new DemoEngine(sp.list.length), error: null });
        return;
      }
      const engine = new OnnxEngine(meta);
      try {
        await engine.init((p) => setModel((m) => ({ ...m, progress: p })));
        setModel({ status: 'ready', progress: null, engine, error: null });
      } catch (e) {
        setModel({ status: 'error', progress: null, engine: null, error: e.message });
      }
    })();
  }, []);

  const ctx = { species, model, stats, observations, earnedIds, title, online, setShare, today };
  if (!species) return <div className="splash">🌿 Wildling</div>;

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        <header className="topbar">
          <div className="brand">Wildling</div>
          <div className="pills">
            <ModelPill model={model} />
            <span className={'pill ' + (online ? 'on' : 'off')}>{online ? 'Online' : 'Offline'}</span>
          </div>
        </header>
        {model.status === 'demo' && (
          <div className="banner warn">
            <b>Demo mode.</b> No model is installed, so guesses are random and labelled DEMO. See README → “Install the model”.
          </div>
        )}
        {model.status === 'error' && <div className="banner bad">Model failed to load: {model.error}</div>}
        <main className="screen">
          {tab === 'explore' && <Explore onStart={() => setFlow({ step: 'camera' })} />}
          {tab === 'collection' && <Collection />}
          {tab === 'progress' && <Progress />}
          {tab === 'about' && <About />}
        </main>
        <nav className="tabbar">
          {TABS.slice(0, 2).map(([id, label, icon]) => <TabBtn key={id} {...{ id, label, icon, tab, setTab }} />)}
          <button className="fab" aria-label="Open camera" onClick={() => setFlow({ step: 'camera' })}>📷</button>
          {TABS.slice(2).map(([id, label, icon]) => <TabBtn key={id} {...{ id, label, icon, tab, setTab }} />)}
        </nav>
        {flow?.step === 'camera' && (
          <Camera onClose={() => setFlow(null)} onCapture={(blob) => setFlow({ step: 'result', blob })} />
        )}
        {flow?.step === 'result' && (
          <Result
            blob={flow.blob}
            onRetake={() => setFlow({ step: 'camera' })}
            onDone={(goTo) => { setFlow(null); if (goTo) setTab(goTo); }}
          />
        )}
        {share && <ShareModal {...share} onClose={() => setShare(null)} />}
      </div>
    </AppCtx.Provider>
  );
}

function TabBtn({ id, label, icon, tab, setTab }) {
  return (
    <button className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>
      <span className="ico">{icon}</span>{label}
    </button>
  );
}

function ModelPill({ model }) {
  if (model.status === 'loading') {
    const p = model.progress;
    const pct = p?.total ? Math.min(99, Math.round((p.loaded / p.total) * 100)) : null;
    return <span className="pill load">{p ? `${p.label}${pct != null ? ` ${pct}%` : '…'}` : 'Loading AI…'}</span>;
  }
  if (model.status === 'ready') return <span className="pill on">AI ready · {model.engine.backend}</span>;
  if (model.status === 'demo') return <span className="pill warn">Demo</span>;
  return <span className="pill off">AI error</span>;
}
