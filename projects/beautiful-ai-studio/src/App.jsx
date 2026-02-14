import React, { useEffect, useMemo, useState } from 'react';
import pptxgen from 'pptxgenjs';

const API = 'http://localhost:8787/api';
const THEMES = {
  Midnight: { bg: '#0c1224', card: '#121a33', text: '#f2f5ff', accent: '#5d8bff' },
  Snow: { bg: '#f4f7ff', card: '#ffffff', text: '#111827', accent: '#3b82f6' },
  Emerald: { bg: '#071b1a', card: '#0b2a28', text: '#ecfffb', accent: '#14b8a6' },
};
const LAYOUTS = ['Title', 'Two Column', 'Metrics', 'Timeline'];
const TEMPLATE_CATEGORIES = {
  Startup: ['Pitch Deck', 'Fundraising Story', 'Product Vision', 'GTM Plan', 'Launch Plan'],
  Enterprise: ['QBR', 'Transformation Plan', 'Executive Update', 'Strategy Review', 'Operating Model'],
  Marketing: ['Campaign Plan', 'Brand Story', 'Content Strategy', 'Social Plan', 'SEO Plan'],
  Sales: ['Client Proposal', 'Solution Demo', 'Account Plan', 'Value Story', 'Renewal Plan'],
  Education: ['Course Outline', 'Workshop Deck', 'Training Program', 'Bootcamp Intro', 'Certification Prep'],
  Product: ['Roadmap', 'Feature Proposal', 'Discovery Insights', 'User Journey', 'Experiment Plan'],
  Technology: ['Architecture Review', 'Migration Plan', 'Security Strategy', 'DevOps Plan', 'AI Adoption Plan'],
  Consulting: ['Assessment Report', 'Diagnostic Summary', 'Engagement Plan', 'Transformation Blueprint', 'Maturity Model'],
  HR: ['Hiring Plan', 'Onboarding Program', 'Culture Deck', 'Performance Framework', 'Org Design'],
  Finance: ['Budget Review', 'Investment Brief', 'Board Pack', 'Revenue Plan', 'Cost Optimization'],
};

const TEMPLATES = (() => {
  const out = [];
  let i = 1;
  Object.entries(TEMPLATE_CATEGORIES).forEach(([cat, patterns]) => {
    for (let n = 1; n <= 25; n += 1) {
      patterns.forEach((p) => {
        out.push({
          id: i++,
          name: `${cat} ${p} ${n}`,
          category: cat,
          prompt: `Create a ${cat.toLowerCase()} ${p.toLowerCase()} presentation with executive storytelling, clear visuals, and action-oriented slides.`,
          badge: cat,
        });
      });
    }
  });
  return out; // 10 categories x 5 patterns x 25 variants = 1250 templates
})();
const seedSlides = [
  { id: crypto.randomUUID(), layout: 'Title', title: 'Your Presentation Title', bullets: ['AI-powered slide generation', 'Smart layouts', 'Brand themes'], notes: '' },
  { id: crypto.randomUUID(), layout: 'Two Column', title: 'Problem vs Solution', left: ['Manual deck creation is slow', 'Inconsistent design quality'], right: ['Use AI prompt to draft structure', 'Auto-fit content into layouts'], notes: '' },
];

function makeSlidesFromPrompt(prompt) {
  const topic = prompt.trim() || 'AI Transformation Strategy';
  return [
    { id: crypto.randomUUID(), layout: 'Title', title: topic, bullets: ['Executive-ready storytelling', 'Clean visual hierarchy', 'Built in seconds'], notes: '' },
    { id: crypto.randomUUID(), layout: 'Two Column', title: 'Current State vs Future State', left: ['Fragmented tools', 'Slow content production', 'Inconsistent branding'], right: ['Unified platform', 'AI-assisted creation', 'Design-consistent output'], notes: '' },
    { id: crypto.randomUUID(), layout: 'Metrics', title: 'Expected Impact', metrics: [{ label: 'Time Saved', value: '70%' }, { label: 'Consistency', value: '95%' }, { label: 'Engagement', value: '+40%' }], notes: '' },
    { id: crypto.randomUUID(), layout: 'Timeline', title: 'Rollout Plan', milestones: ['Week 1: Brand and content setup', 'Week 2: AI generation workflows', 'Week 3: Team enablement', 'Week 4: Production launch'], notes: '' },
  ];
}

export default function App() {
  const [themeName, setThemeName] = useState('Midnight');
  const [slides, setSlides] = useState(seedSlides);
  const [active, setActive] = useState(seedSlides[0].id);
  const [prompt, setPrompt] = useState('Build an investor pitch for AI-powered test automation platform');
  const [token, setToken] = useState(localStorage.getItem('bas_token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deckTitle, setDeckTitle] = useState('My Deck');
  const [deckId, setDeckId] = useState(null);
  const [decks, setDecks] = useState([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState('All');
  const [templateLimit, setTemplateLimit] = useState(60);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('bas_favorites') || '[]'));
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Custom');
  const [customPrompt, setCustomPrompt] = useState('');
  const [customTemplates, setCustomTemplates] = useState(() => JSON.parse(localStorage.getItem('bas_custom_templates') || '[]'));

  const theme = THEMES[themeName];
  const activeSlide = slides.find((s) => s.id === active) || slides[0];

  const authedFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });

  const loadDecks = async () => {
    if (!token) return;
    const r = await authedFetch(`${API}/decks`);
    if (!r.ok) return;
    const d = await r.json();
    setDecks(d.decks || []);
  };

  useEffect(() => { loadDecks(); }, [token]);

  const register = async () => {
    const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name: email.split('@')[0] }) });
    const d = await r.json();
    if (d.token) { localStorage.setItem('bas_token', d.token); setToken(d.token); }
    else alert(d.error || 'Register failed');
  };
  const login = async () => {
    const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const d = await r.json();
    if (d.token) { localStorage.setItem('bas_token', d.token); setToken(d.token); }
    else alert(d.error || 'Login failed');
  };
  const logout = () => { localStorage.removeItem('bas_token'); setToken(''); setDecks([]); };

  const applyPatch = (patch) => setSlides((prev) => prev.map((s) => (s.id === active ? { ...s, ...patch } : s)));
  const addSlide = (layout = 'Title') => { const next = { id: crypto.randomUUID(), layout, title: 'New Slide', bullets: ['Add content'], notes: '' }; setSlides((p) => [...p, next]); setActive(next.id); };
  const duplicateSlide = () => { if (!activeSlide) return; const copy = { ...activeSlide, id: crypto.randomUUID(), title: `${activeSlide.title} (Copy)` }; setSlides((p) => [...p, copy]); setActive(copy.id); };
  const removeSlide = () => { if (slides.length <= 1) return; const i = slides.findIndex((s) => s.id === active); const n = slides.filter((s) => s.id !== active); setSlides(n); setActive(n[Math.max(0, i - 1)].id); };
  const generateDeck = () => { const generated = makeSlidesFromPrompt(prompt); setSlides(generated); setActive(generated[0].id); setDeckTitle(prompt.slice(0, 80)); setDeckId(null); };

  const saveDeck = async () => {
    if (!token) return alert('Please login first');
    const r = await authedFetch(`${API}/decks`, { method: 'POST', body: JSON.stringify({ id: deckId, title: deckTitle || 'Untitled Deck', theme: themeName, slides }) });
    const d = await r.json();
    if (d.id) { setDeckId(d.id); await loadDecks(); alert('Deck saved'); }
  };

  const openDeck = async (id) => {
    const r = await authedFetch(`${API}/decks/${id}`);
    const d = await r.json();
    if (!d.deck) return;
    setDeckId(d.deck.id);
    setDeckTitle(d.deck.title);
    setThemeName(d.deck.theme);
    setSlides(d.deck.slides);
    setActive(d.deck.slides[0]?.id);
  };

  const publishDeck = async () => {
    if (!deckId) return alert('Save deck first');
    const r = await authedFetch(`${API}/decks/${deckId}/publish`, { method: 'POST' });
    const d = await r.json();
    if (d.url) {
      await navigator.clipboard.writeText(d.url);
      alert(`Published. Link copied:\n${d.url}`);
      await loadDecks();
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ theme: themeName, slides }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'beautiful-ai-studio-deck.json'; link.click();
  };

  const exportPpt = async () => {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    slides.forEach((s) => {
      const slide = pptx.addSlide();
      slide.background = { color: themeName === 'Snow' ? 'FFFFFF' : '0F172A' };
      if (s.layout === 'Title') {
        slide.addText(s.title || '', { x: 0.6, y: 0.5, w: 12, h: 0.8, fontSize: 34, bold: true, color: themeName === 'Snow' ? '111827' : 'F8FAFC' });
        (s.bullets || []).forEach((b, i) => slide.addText(`• ${b}`, { x: 0.9, y: 1.7 + i * 0.5, w: 11, h: 0.4, fontSize: 20, color: themeName === 'Snow' ? '374151' : 'CBD5E1' }));
      } else if (s.layout === 'Two Column') {
        slide.addText(s.title || '', { x: 0.6, y: 0.4, w: 12, h: 0.6, fontSize: 28, bold: true, color: themeName === 'Snow' ? '111827' : 'F8FAFC' });
        (s.left || []).forEach((b, i) => slide.addText(`• ${b}`, { x: 0.7, y: 1.4 + i * 0.45, w: 5.8, h: 0.35, fontSize: 16, color: themeName === 'Snow' ? '374151' : 'CBD5E1' }));
        (s.right || []).forEach((b, i) => slide.addText(`• ${b}`, { x: 6.8, y: 1.4 + i * 0.45, w: 5.8, h: 0.35, fontSize: 16, color: themeName === 'Snow' ? '374151' : 'CBD5E1' }));
      } else if (s.layout === 'Metrics') {
        slide.addText(s.title || '', { x: 0.6, y: 0.4, w: 12, h: 0.6, fontSize: 28, bold: true, color: themeName === 'Snow' ? '111827' : 'F8FAFC' });
        (s.metrics || []).forEach((m, i) => {
          const x = 0.8 + i * 4;
          slide.addShape(pptx.ShapeType.roundRect, { x, y: 2.2, w: 3.4, h: 2.1, fill: { color: '1D4ED8' }, line: { color: '1D4ED8' }, rectRadius: 0.08 });
          slide.addText(m.value || '', { x: x + 0.2, y: 2.7, w: 3, h: 0.7, fontSize: 34, bold: true, color: 'FFFFFF', align: 'center' });
          slide.addText(m.label || '', { x: x + 0.2, y: 3.5, w: 3, h: 0.4, fontSize: 15, color: 'DBEAFE', align: 'center' });
        });
      } else {
        slide.addText(s.title || '', { x: 0.6, y: 0.4, w: 12, h: 0.6, fontSize: 28, bold: true, color: themeName === 'Snow' ? '111827' : 'F8FAFC' });
        (s.milestones || []).forEach((m, i) => {
          slide.addShape(pptx.ShapeType.ellipse, { x: 0.9, y: 1.4 + i * 1.1, w: 0.35, h: 0.35, fill: { color: '14B8A6' }, line: { color: '14B8A6' } });
          slide.addText(m, { x: 1.4, y: 1.35 + i * 1.1, w: 10.8, h: 0.5, fontSize: 17, color: themeName === 'Snow' ? '374151' : 'CBD5E1' });
        });
      }
    });
    await pptx.writeFile({ fileName: 'beautiful-ai-studio-deck.pptx' });
  };

  const allTemplates = useMemo(() => [...customTemplates, ...TEMPLATES], [customTemplates]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    const source = templateCategory === 'Favorites'
      ? allTemplates.filter((t) => favorites.includes(t.id || t.name))
      : allTemplates;
    return source.filter((t) => {
      const catOk = templateCategory === 'All' || templateCategory === 'Favorites' || t.category === templateCategory;
      const qOk = !q || t.name.toLowerCase().includes(q) || t.prompt.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [templateSearch, templateCategory, allTemplates, favorites]);

  const toggleFavorite = (templateKey) => {
    setFavorites((prev) => {
      const next = prev.includes(templateKey) ? prev.filter((x) => x !== templateKey) : [...prev, templateKey];
      localStorage.setItem('bas_favorites', JSON.stringify(next));
      return next;
    });
  };

  const addCustomTemplate = () => {
    if (!customName.trim() || !customPrompt.trim()) return;
    const t = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      category: customCategory.trim() || 'Custom',
      prompt: customPrompt.trim(),
      badge: 'Custom',
    };
    const next = [t, ...customTemplates];
    setCustomTemplates(next);
    localStorage.setItem('bas_custom_templates', JSON.stringify(next));
    setCustomName('');
    setCustomPrompt('');
    setTemplateCategory('All');
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
          <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {!token ? <><button onClick={register}>Register</button><button onClick={login}>Login</button></> : <button onClick={logout}>Logout</button>}
        </div>
      </header>

      <div className="workspace">
        <aside className="left">
          <div className="panel-title">Slides</div>
          <input value={deckTitle} onChange={(e) => setDeckTitle(e.target.value)} placeholder="Deck title" style={{ width: '100%', marginBottom: 10, padding: 10 }} />
          <div className="stack">
            {slides.map((s, i) => (
              <button key={s.id} className={`thumb ${s.id === active ? 'active' : ''}`} onClick={() => setActive(s.id)}>
                <span>{i + 1}. {s.layout}</span><small>{s.title}</small>
              </button>
            ))}
          </div>
          <div className="row"><button onClick={() => addSlide()}>+ Slide</button><button onClick={duplicateSlide}>Duplicate</button><button onClick={removeSlide}>Delete</button></div>
          <div className="row" style={{ marginTop: 8 }}><button onClick={saveDeck}>Save</button><button onClick={publishDeck}>Publish</button><button onClick={exportPpt}>PPT</button></div>
          <div className="panel-title" style={{ marginTop: 16 }}>Template Marketplace ({allTemplates.length})</div>
          <input placeholder="Search templates..." value={templateSearch} onChange={(e) => { setTemplateSearch(e.target.value); setTemplateLimit(60); }} style={{ width: '100%', marginBottom: 8, padding: 10 }} />
          <select value={templateCategory} onChange={(e) => { setTemplateCategory(e.target.value); setTemplateLimit(60); }} style={{ width: '100%', marginBottom: 10, padding: 10 }}>
            <option value="All">All Categories</option>
            <option value="Favorites">Favorites</option>
            <option value="Custom">Custom</option>
            {Object.keys(TEMPLATE_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="stack">{filteredTemplates.slice(0, templateLimit).map((t) => {
            const key = t.id || t.name;
            const fav = favorites.includes(key);
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
                <button className="thumb" onClick={() => { setPrompt(t.prompt); setTimeout(generateDeck, 50); }}><span>{t.name}</span><small>{t.badge}</small></button>
                <button title="favorite" onClick={() => toggleFavorite(key)}>{fav ? '★' : '☆'}</button>
              </div>
            );
          })}</div>
          <small style={{ opacity: .8, display: 'block', marginTop: 6 }}>{filteredTemplates.length} matching templates · showing first {Math.min(templateLimit, filteredTemplates.length)}</small>
          {templateLimit < filteredTemplates.length && <button style={{ marginTop: 8, width: '100%' }} onClick={() => setTemplateLimit((n) => n + 60)}>Load 60 more</button>}

          <div className="panel-title" style={{ marginTop: 16 }}>Custom Template Builder</div>
          <input placeholder="Template name" value={customName} onChange={(e) => setCustomName(e.target.value)} style={{ width: '100%', marginBottom: 8, padding: 10 }} />
          <input placeholder="Category (e.g. FinTech, Healthcare)" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} style={{ width: '100%', marginBottom: 8, padding: 10 }} />
          <textarea placeholder="Prompt used to generate this template..." value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} rows={3} style={{ width: '100%', marginBottom: 8, padding: 10 }} />
          <button onClick={addCustomTemplate}>Save Custom Template</button>
          <div className="panel-title" style={{ marginTop: 16 }}>My Decks</div>
          <div className="stack">{decks.map((d) => <button key={d.id} className="thumb" onClick={() => openDeck(d.id)}><span>{d.title}</span><small>{d.is_published ? `Published: ${d.slug}` : 'Draft'}</small></button>)}</div>
        </aside>

        <main className="canvas-wrap">
          <div className="slide" style={{ background: theme.card, color: theme.text }}>
            {activeSlide?.layout === 'Title' && <><h1>{activeSlide.title}</h1><ul>{(activeSlide.bullets || []).map((b, i) => <li key={i}>{b}</li>)}</ul></>}
            {activeSlide?.layout === 'Two Column' && <><h2>{activeSlide.title}</h2><div className="two-col"><ul>{(activeSlide.left || []).map((b, i) => <li key={i}>{b}</li>)}</ul><ul>{(activeSlide.right || []).map((b, i) => <li key={i}>{b}</li>)}</ul></div></>}
            {activeSlide?.layout === 'Metrics' && <><h2>{activeSlide.title}</h2><div className="metrics">{(activeSlide.metrics || []).map((m, i) => <div key={i} className="metric"><strong>{m.value}</strong><span>{m.label}</span></div>)}</div></>}
            {activeSlide?.layout === 'Timeline' && <><h2>{activeSlide.title}</h2><ol>{(activeSlide.milestones || []).map((m, i) => <li key={i}>{m}</li>)}</ol></>}
          </div>
        </main>

        <aside className="right">
          <div className="panel-title">Properties</div>
          <label>Layout<select value={activeSlide?.layout || 'Title'} onChange={(e) => applyPatch({ layout: e.target.value })}>{LAYOUTS.map((l) => <option key={l}>{l}</option>)}</select></label>
          <label>Title<input value={activeSlide?.title || ''} onChange={(e) => applyPatch({ title: e.target.value })} /></label>
          <label>Speaker Notes<textarea value={activeSlide?.notes || ''} onChange={(e) => applyPatch({ notes: e.target.value })} rows={5} /></label>
          <button onClick={exportJson}>Export JSON</button>
          <div className="health"><span>Deck Completeness</span><div className="bar"><i style={{ width: `${progress}%` }} /></div></div>
        </aside>
      </div>
    </div>
  );
}
