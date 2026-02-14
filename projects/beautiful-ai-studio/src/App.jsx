import React, { useMemo, useState } from 'react';

const THEMES = {
  Midnight: { bg: '#0c1224', card: '#121a33', text: '#f2f5ff', accent: '#5d8bff' },
  Snow: { bg: '#f4f7ff', card: '#ffffff', text: '#111827', accent: '#3b82f6' },
  Emerald: { bg: '#071b1a', card: '#0b2a28', text: '#ecfffb', accent: '#14b8a6' },
};

const LAYOUTS = ['Title', 'Two Column', 'Metrics', 'Timeline'];

const seedSlides = [
  { id: crypto.randomUUID(), layout: 'Title', title: 'Your Presentation Title', bullets: ['AI-powered slide generation', 'Smart layouts', 'Brand themes'], notes: '' },
  { id: crypto.randomUUID(), layout: 'Two Column', title: 'Problem vs Solution', left: ['Manual deck creation is slow', 'Inconsistent design quality'], right: ['Use AI prompt to draft structure', 'Auto-fit content into layouts'], notes: '' },
];

function makeSlidesFromPrompt(prompt) {
  const clean = prompt.trim();
  const topic = clean || 'AI Transformation Strategy';
  return [
    { id: crypto.randomUUID(), layout: 'Title', title: topic, bullets: ['Executive-ready storytelling', 'Clean visual hierarchy', 'Built in seconds'], notes: '' },
    { id: crypto.randomUUID(), layout: 'Two Column', title: 'Current State vs Future State', left: ['Fragmented tools', 'Slow content production', 'Inconsistent branding'], right: ['Unified platform', 'AI-assisted creation', 'Design-consistent output'], notes: '' },
    { id: crypto.randomUUID(), layout: 'Metrics', title: 'Expected Impact', metrics: [{ label: 'Time Saved', value: '70%' }, { label: 'Consistency', value: '95%' }, { label: 'Engagement', value: '+40%' }], notes: '' },
    { id: crypto.randomUUID(), layout: 'Timeline', title: 'Rollout Plan', milestones: ['Week 1: Brand and content setup', 'Week 2: AI generation workflows', 'Week 3: Team enablement', 'Week 4: Production launch'], notes: '' },
  ];
}

function App() {
  const [themeName, setThemeName] = useState('Midnight');
  const [slides, setSlides] = useState(seedSlides);
  const [active, setActive] = useState(seedSlides[0].id);
  const [prompt, setPrompt] = useState('Build an investor pitch for AI-powered test automation platform');

  const theme = THEMES[themeName];
  const activeSlide = slides.find((s) => s.id === active) || slides[0];

  const applyPatch = (patch) => {
    setSlides((prev) => prev.map((s) => (s.id === active ? { ...s, ...patch } : s)));
  };

  const addSlide = (layout = 'Title') => {
    const next = { id: crypto.randomUUID(), layout, title: 'New Slide', bullets: ['Add content'], notes: '' };
    setSlides((p) => [...p, next]);
    setActive(next.id);
  };

  const duplicateSlide = () => {
    if (!activeSlide) return;
    const copy = { ...activeSlide, id: crypto.randomUUID(), title: `${activeSlide.title} (Copy)` };
    setSlides((p) => [...p, copy]);
    setActive(copy.id);
  };

  const removeSlide = () => {
    if (slides.length <= 1) return;
    const idx = slides.findIndex((s) => s.id === active);
    const nextSlides = slides.filter((s) => s.id !== active);
    setSlides(nextSlides);
    setActive(nextSlides[Math.max(0, idx - 1)].id);
  };

  const generateDeck = () => {
    const generated = makeSlidesFromPrompt(prompt);
    setSlides(generated);
    setActive(generated[0].id);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ theme: themeName, slides }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'beautiful-ai-studio-deck.json';
    link.click();
  };

  const progress = useMemo(() => Math.min(100, Math.round((slides.length / 10) * 100)), [slides.length]);

  return (
    <div className="app" style={{ '--bg': theme.bg, '--card': theme.card, '--text': theme.text, '--accent': theme.accent }}>
      <header className="topbar">
        <div className="logo">Beautiful AI Studio</div>
        <div className="prompt-wrap">
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe presentation goal..." />
          <button className="primary" onClick={generateDeck}>Generate with AI</button>
        </div>
        <div className="top-actions">
          <select value={themeName} onChange={(e) => setThemeName(e.target.value)}>
            {Object.keys(THEMES).map((t) => <option key={t}>{t}</option>)}
          </select>
          <button onClick={exportJson}>Export</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="left">
          <div className="panel-title">Slides</div>
          <div className="stack">
            {slides.map((s, i) => (
              <button key={s.id} className={`thumb ${s.id === active ? 'active' : ''}`} onClick={() => setActive(s.id)}>
                <span>{i + 1}. {s.layout}</span>
                <small>{s.title}</small>
              </button>
            ))}
          </div>
          <div className="row">
            <button onClick={() => addSlide()}>+ Slide</button>
            <button onClick={duplicateSlide}>Duplicate</button>
            <button onClick={removeSlide}>Delete</button>
          </div>
        </aside>

        <main className="canvas-wrap">
          <div className="slide" style={{ background: theme.card, color: theme.text }}>
            {activeSlide?.layout === 'Title' && (
              <>
                <h1>{activeSlide.title}</h1>
                <ul>{(activeSlide.bullets || []).map((b, i) => <li key={i}>{b}</li>)}</ul>
              </>
            )}
            {activeSlide?.layout === 'Two Column' && (
              <>
                <h2>{activeSlide.title}</h2>
                <div className="two-col">
                  <ul>{(activeSlide.left || []).map((b, i) => <li key={i}>{b}</li>)}</ul>
                  <ul>{(activeSlide.right || []).map((b, i) => <li key={i}>{b}</li>)}</ul>
                </div>
              </>
            )}
            {activeSlide?.layout === 'Metrics' && (
              <>
                <h2>{activeSlide.title}</h2>
                <div className="metrics">
                  {(activeSlide.metrics || []).map((m, i) => (
                    <div key={i} className="metric"><strong>{m.value}</strong><span>{m.label}</span></div>
                  ))}
                </div>
              </>
            )}
            {activeSlide?.layout === 'Timeline' && (
              <>
                <h2>{activeSlide.title}</h2>
                <ol>{(activeSlide.milestones || []).map((m, i) => <li key={i}>{m}</li>)}</ol>
              </>
            )}
          </div>
        </main>

        <aside className="right">
          <div className="panel-title">Properties</div>
          <label>Layout
            <select value={activeSlide?.layout || 'Title'} onChange={(e) => applyPatch({ layout: e.target.value })}>
              {LAYOUTS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label>Title
            <input value={activeSlide?.title || ''} onChange={(e) => applyPatch({ title: e.target.value })} />
          </label>
          <label>Speaker Notes
            <textarea value={activeSlide?.notes || ''} onChange={(e) => applyPatch({ notes: e.target.value })} rows={5} />
          </label>
          <div className="health">
            <span>Deck Completeness</span>
            <div className="bar"><i style={{ width: `${progress}%` }} /></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
