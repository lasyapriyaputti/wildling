import React from 'react';
import { useApp } from '../context.js';

/** Opens the share modal with the right card content. */
export default function ShareButton({ kind, badge, species, photoBlob, label = 'Share card' }) {
  const { setShare, stats, title } = useApp();
  function open() {
    const base = [
      { value: stats.distinctSpecies, label: 'Species' },
      { value: stats.streak.current, label: 'Day streak' },
      { value: stats.streak.longest, label: 'Best streak' }
    ];
    if (kind === 'badge') {
      setShare({
        card: { emoji: badge.emoji, headline: badge.name, sub: species ? `${species.common} · ${species.sci}` : title.name,
          note: badge.desc, photoBlob, stats: base },
        filename: `wildling-${badge.id}.png`,
        text: `I earned “${badge.name}” on Wildling by finding real wildlife outdoors. 🌿`
      });
    } else {
      setShare({
        card: { emoji: title.emoji, headline: species.common, sub: species.sci,
          note: `Spotted outdoors · ${title.name}`, photoBlob, stats: base },
        filename: `wildling-${species.sci.replace(/\s+/g, '-').toLowerCase()}.png`,
        text: `Found a ${species.common} (${species.sci}) outdoors today. 🌿 #TouchGrass`
      });
    }
  }
  return <button className="btn ghost" onClick={open}>{label} ↗</button>;
}
