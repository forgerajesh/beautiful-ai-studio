import React, { useEffect, useMemo, useState } from 'react';
import pptxgen from 'pptxgenjs';

const API = import.meta.env.VITE_API_BASE || '/api';
const APP_NAME = 'DeckForge Studio';
const THEMES = {
  Nebula: { bg: '#0b1022', card: '#131a34', text: '#f4f6ff', accent: '#7c5cff' },
  Pearl: { bg: '#f5f7ff', card: '#ffffff', text: '#111827', accent: '#4f46e5' },
  Aurora: { bg: '#071b22', card: '#0d2a33', text: '#ecffff', accent: '#06b6d4' },
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
      patterns.forEach((p) => out.push({ id: i++, name: `${cat} ${p} ${n}`, category: cat, prompt: `Create a ${cat.toLowerCase()} ${p.toLowerCase()} presentation with executive storytelling, clear visuals, and action-oriented slides.`, badge: cat }));
    }
  });
  return out;
})();

const PROMPT_PRESETS = [
  {
    id: 'investor',
    name: 'Investor Pitch',
    audience: 'Seed/Series-A investors',
    goal: 'Secure funding decision',
    slideCount: 8,
    tone: 'Investor',
    mustHaveSections: 'Problem,Solution,Market,Business Model,Competition,Traction,Roadmap,Ask',
    constraints: 'Max 4 bullets per slide; include one metrics slide',
    prompt: 'AI-powered QA automation platform',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Architecture',
    audience: 'CTO, VP Engineering, QA Director',
    goal: 'Approve target architecture and rollout',
    slideCount: 10,
    tone: 'Technical',
    mustHaveSections: 'Current Challenges,Target Architecture,Security,CI/CD,Observability,Rollout,Risks,ROI',
    constraints: 'Cloud-neutral design; compliance-ready controls',
    prompt: 'Unified TestOps architecture for enterprise',
  },
  {
    id: 'proposal',
    name: 'Client Proposal',
    audience: 'Client leadership team',
    goal: 'Win implementation engagement',
    slideCount: 7,
    tone: 'Corporate',
    mustHaveSections: 'Current State,Approach,Delivery Plan,Governance,Expected Outcomes,CTA',
    constraints: 'Business language, low jargon',
    prompt: 'QA transformation consulting proposal',
  },
];

const seedSlides = [
  { id: crypto.randomUUID(), layout: 'Title', title: 'Your Presentation Title', bullets: ['AI-powered slide generation', 'Smart layouts', 'Brand themes'], notes: '' },
  { id: crypto.randomUUID(), layout: 'Two Column', title: 'Problem vs Solution', left: ['Manual deck creation is slow', 'Inconsistent design quality'], right: ['Use AI prompt to draft structure', 'Auto-fit content into layouts'], notes: '' },
];

const makeSlidesFromPrompt = (prompt) => {
  const topic = prompt.trim() || 'AI Transformation Strategy';
  return [
    { id: crypto.randomUUID(), layout: 'Title', title: topic, bullets: ['Executive-ready storytelling', 'Clean visual hierarchy', 'Built in seconds'], notes: '' },
    { id: crypto.randomUUID(), layout: 'Two Column', title: 'Current State vs Future State', left: ['Fragmented tools', 'Slow content production', 'Inconsistent branding'], right: ['Unified platform', 'AI-assisted creation', 'Design-consistent output'], notes: '' },
    { id: crypto.randomUUID(), layout: 'Metrics', title: 'Expected Impact', metrics: [{ label: 'Time Saved', value: '70%' }, { label: 'Consistency', value: '95%' }, { label: 'Engagement', value: '+40%' }], notes: '' },
    { id: crypto.randomUUID(), layout: 'Timeline', title: 'Rollout Plan', milestones: ['Week 1: Brand and content setup', 'Week 2: AI generation workflows', 'Week 3: Team enablement', 'Week 4: Production launch'], notes: '' },
  ];
};

const thumb = (cat) => {
  const map = {
    Startup: ['🚀', 'linear-gradient(135deg,#1d4ed8,#7c3aed)'], Enterprise: ['🏢', 'linear-gradient(135deg,#0f766e,#2563eb)'], Marketing: ['📣', 'linear-gradient(135deg,#d946ef,#ec4899)'],
    Sales: ['💼', 'linear-gradient(135deg,#f59e0b,#ef4444)'], Education: ['🎓', 'linear-gradient(135deg,#0ea5e9,#22c55e)'], Product: ['🧩', 'linear-gradient(135deg,#8b5cf6,#3b82f6)'],
    Technology: ['⚙️', 'linear-gradient(135deg,#334155,#2563eb)'], Consulting: ['📊', 'linear-gradient(135deg,#0f766e,#14b8a6)'], HR: ['👥', 'linear-gradient(135deg,#7c3aed,#ec4899)'],
    Finance: ['💹', 'linear-gradient(135deg,#14532d,#16a34a)'], Custom: ['✨', 'linear-gradient(135deg,#0f172a,#475569)'],
  };
  return map[cat] || ['📄', 'linear-gradient(135deg,#1f2937,#4b5563)'];
};

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [themeName, setThemeName] = useState('Nebula');
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
  const [favoriteOrder, setFavoriteOrder] = useState(() => JSON.parse(localStorage.getItem('bas_favorite_order') || '[]'));
  const [draggingFav, setDraggingFav] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Custom');
  const [customPrompt, setCustomPrompt] = useState('');
  const [customTemplates, setCustomTemplates] = useState(() => JSON.parse(localStorage.getItem('bas_custom_templates') || '[]'));
  const [llmLoading, setLlmLoading] = useState(false);
  const [tone, setTone] = useState('Corporate');
  const [audience, setAudience] = useState('Leadership team');
  const [goal, setGoal] = useState('Drive an approval decision');
  const [slideCount, setSlideCount] = useState(6);
  const [mustHaveSections, setMustHaveSections] = useState('Problem,Solution,Plan,Impact,CTA');
  const [constraints, setConstraints] = useState('Max 5 bullets per slide');
  const [brandPrimary, setBrandPrimary] = useState(localStorage.getItem('bas_brand_primary') || '#7c5cff');
  const [brandFont, setBrandFont] = useState(localStorage.getItem('bas_brand_font') || 'Inter, Arial');
  const [brandLogo, setBrandLogo] = useState(localStorage.getItem('bas_brand_logo') || '');
  const [versionHistory, setVersionHistory] = useState(() => JSON.parse(localStorage.getItem('bas_versions') || '[]'));

  const theme = THEMES[themeName];
  const activeSlide = slides.find((s) => s.id === active) || slides[0];
  const authedFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });

  const allTemplates = useMemo(() => [...customTemplates, ...TEMPLATES], [customTemplates]);
  const byId = useMemo(() => new Map(allTemplates.map((t) => [String(t.id || t.name), t])), [allTemplates]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    const source = templateCategory === 'Favorites' ? allTemplates.filter((t) => favorites.includes(String(t.id || t.name))) : allTemplates;
    return source.filter((t) => (templateCategory === 'All' || templateCategory === 'Favorites' || t.category === templateCategory) && (!q || t.name.toLowerCase().includes(q) || t.prompt.toLowerCase().includes(q)));
  }, [templateSearch, templateCategory, allTemplates, favorites]);

  const favoriteTemplates = useMemo(() => {
    const base = favorites.map((id) => byId.get(String(id))).filter(Boolean);
    const ordered = favoriteOrder.map((id) => byId.get(String(id))).filter(Boolean);
    const extra = base.filter((t) => !ordered.find((o) => String(o.id || o.name) === String(t.id || t.name)));
    return [...ordered, ...extra];
  }, [favorites, favoriteOrder, byId]);

  useEffect(() => { if (favoriteTemplates.length) { const ids = favoriteTemplates.map((t) => String(t.id || t.name)); setFavoriteOrder(ids); localStorage.setItem('bas_favorite_order', JSON.stringify(ids)); } }, [favorites.length]);
  useEffect(() => {
    if (!token) return;
    authedFetch(`${API}/decks`)
      .then((r) => r.json())
      .then((d) => setDecks(d.decks || []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    localStorage.setItem('bas_brand_primary', brandPrimary);
    localStorage.setItem('bas_brand_font', brandFont);
    localStorage.setItem('bas_brand_logo', brandLogo);
  }, [brandPrimary, brandFont, brandLogo]);

  useEffect(() => {
    const t = setTimeout(() => {
      const snap = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        title: deckTitle || 'Untitled Deck',
        themeName,
        slides,
      };
      const next = [snap, ...versionHistory].slice(0, 20);
      setVersionHistory(next);
      localStorage.setItem('bas_versions', JSON.stringify(next));
    }, 600);
    return () => clearTimeout(t);
  }, [slides, deckTitle, themeName]);

  const register = async () => { const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name: email.split('@')[0] }) }); const d = await r.json(); d.token ? (localStorage.setItem('bas_token', d.token), setToken(d.token)) : alert(d.error || 'Register failed'); };
  const login = async () => { const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); const d = await r.json(); d.token ? (localStorage.setItem('bas_token', d.token), setToken(d.token)) : alert(d.error || 'Login failed'); };
  const logout = () => { localStorage.removeItem('bas_token'); setToken(''); setDecks([]); };

  const applyPatch = (patch) => setSlides((prev) => prev.map((s) => (s.id === active ? { ...s, ...patch } : s)));
  const addSlide = (layout = 'Title') => { const next = { id: crypto.randomUUID(), layout, title: 'New Slide', bullets: ['Add content'], notes: '' }; setSlides((p) => [...p, next]); setActive(next.id); };
  const duplicateSlide = () => { if (!activeSlide) return; const copy = { ...activeSlide, id: crypto.randomUUID(), title: `${activeSlide.title} (Copy)` }; setSlides((p) => [...p, copy]); setActive(copy.id); };
  const removeSlide = () => { if (slides.length <= 1) return; const i = slides.findIndex((s) => s.id === active); const n = slides.filter((s) => s.id !== active); setSlides(n); setActive(n[Math.max(0, i - 1)].id); };
  const generateDeck = async (mode = 'v1') => {
    setDeckTitle(prompt.slice(0, 80));
    setDeckId(null);

    if (!token) {
      const generated = makeSlidesFromPrompt(prompt);
      setSlides(generated);
      setActive(generated[0].id);
      return;
    }

    setLlmLoading(true);
    try {
      const r = await authedFetch(`${API}/ai/generate`, {
        method: 'POST',
        body: JSON.stringify({
          mode,
          prompt,
          tone,
          audience,
          goal,
          slideCount: Number(slideCount) || 6,
          mustHaveSections: mustHaveSections.split(',').map((s) => s.trim()).filter(Boolean),
          constraints,
        }),
      });
      const d = await r.json();
      if (d?.slides?.length) {
        setSlides(d.slides);
        setActive(d.slides[0].id);
      } else {
        const generated = makeSlidesFromPrompt(prompt);
        setSlides(generated);
        setActive(generated[0].id);
      }
    } catch {
      const generated = makeSlidesFromPrompt(prompt);
      setSlides(generated);
      setActive(generated[0].id);
    } finally {
      setLlmLoading(false);
    }
  };

  const improveSelectedSlide = async () => {
    if (!token) return alert('Please login first');
    const current = slides.find((s) => s.id === active);
    if (!current) return;
    setLlmLoading(true);
    try {
      const r = await authedFetch(`${API}/ai/improve-slide`, {
        method: 'POST',
        body: JSON.stringify({
          tone,
          objective: `Improve this slide for ${tone} presentation style with clear and concise storytelling`,
          slide: { ...current, id: undefined },
        }),
      });
      const d = await r.json();
      if (d?.slide) {
        setSlides((prev) => prev.map((s) => (s.id === active ? { ...d.slide, id: s.id } : s)));
      }
    } catch {
      alert('Slide improvement failed');
    } finally {
      setLlmLoading(false);
    }
  };

  const saveDeck = async () => { if (!token) return alert('Please login first'); const r = await authedFetch(`${API}/decks`, { method: 'POST', body: JSON.stringify({ id: deckId, title: deckTitle || 'Untitled Deck', theme: themeName, slides }) }); const d = await r.json(); if (d.id) { setDeckId(d.id); const lr = await authedFetch(`${API}/decks`); setDecks((await lr.json()).decks || []); alert('Deck saved'); } };
  const openDeck = async (id) => { const r = await authedFetch(`${API}/decks/${id}`); const d = await r.json(); if (!d.deck) return; setDeckId(d.deck.id); setDeckTitle(d.deck.title); setThemeName(d.deck.theme || 'Nebula'); setSlides(d.deck.slides); setActive(d.deck.slides[0]?.id); };
  const publishDeck = async () => { if (!deckId) return alert('Save deck first'); const r = await authedFetch(`${API}/decks/${deckId}/publish`, { method: 'POST' }); const d = await r.json(); if (d.url) { await navigator.clipboard.writeText(d.url); alert(`Published. Link copied:\n${d.url}`); } };

  const exportJson = () => { const blob = new Blob([JSON.stringify({ theme: themeName, slides }, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'beautiful-ai-studio-deck.json'; link.click(); };
  const exportPpt = async () => { const p = new pptxgen(); p.layout = 'LAYOUT_WIDE'; slides.forEach((s) => { const sl = p.addSlide(); sl.background = { color: themeName === 'Snow' ? 'FFFFFF' : '0F172A' }; sl.addText(s.title || '', { x: 0.6, y: 0.4, w: 12, h: 0.7, fontSize: 30, bold: true, color: themeName === 'Snow' ? '111827' : 'F8FAFC' }); if (s.layout === 'Two Column') { (s.left || []).forEach((b, i) => sl.addText(`• ${b}`, { x: 0.7, y: 1.3 + i * 0.45, w: 5.7, h: 0.35, fontSize: 16, color: themeName === 'Snow' ? '374151' : 'CBD5E1' })); (s.right || []).forEach((b, i) => sl.addText(`• ${b}`, { x: 6.8, y: 1.3 + i * 0.45, w: 5.7, h: 0.35, fontSize: 16, color: themeName === 'Snow' ? '374151' : 'CBD5E1' })); } else if (s.layout === 'Metrics') { (s.metrics || []).forEach((m, i) => { const x = 0.8 + i * 4; sl.addShape(p.ShapeType.roundRect, { x, y: 2.1, w: 3.4, h: 2.1, fill: { color: '1D4ED8' }, line: { color: '1D4ED8' }, rectRadius: 0.08 }); sl.addText(m.value || '', { x: x + 0.2, y: 2.6, w: 3, h: 0.7, fontSize: 34, bold: true, color: 'FFFFFF', align: 'center' }); sl.addText(m.label || '', { x: x + 0.2, y: 3.4, w: 3, h: 0.4, fontSize: 15, color: 'DBEAFE', align: 'center' }); }); } else if (s.layout === 'Timeline') { (s.milestones || []).forEach((m, i) => { sl.addShape(p.ShapeType.ellipse, { x: 0.9, y: 1.4 + i * 1.1, w: 0.35, h: 0.35, fill: { color: '14B8A6' }, line: { color: '14B8A6' } }); sl.addText(m, { x: 1.4, y: 1.35 + i * 1.1, w: 10.8, h: 0.5, fontSize: 17, color: themeName === 'Snow' ? '374151' : 'CBD5E1' }); }); } else { (s.bullets || []).forEach((b, i) => sl.addText(`• ${b}`, { x: 0.9, y: 1.6 + i * 0.5, w: 11, h: 0.4, fontSize: 20, color: themeName === 'Snow' ? '374151' : 'CBD5E1' })); } }); await p.writeFile({ fileName: 'beautiful-ai-studio-deck.pptx' }); };
  const exportPdf = () => window.print();
  const restoreVersion = (id) => {
    const snap = versionHistory.find((v) => v.id === id);
    if (!snap) return;
    setDeckTitle(snap.title || 'Restored Deck');
    setThemeName(snap.themeName || 'Nebula');
    setSlides(snap.slides || seedSlides);
    setActive((snap.slides && snap.slides[0]?.id) || seedSlides[0].id);
  };

  const toggleFavorite = (k) => setFavorites((prev) => { const key = String(k); const next = prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]; localStorage.setItem('bas_favorites', JSON.stringify(next)); return next; });
  const addCustomTemplate = () => {
    if (!customName.trim() || !customPrompt.trim()) return;
    const t = { id: `custom-${Date.now()}`, name: customName.trim(), category: customCategory.trim() || 'Custom', prompt: customPrompt.trim(), badge: 'Custom' };
    const next = [t, ...customTemplates]; setCustomTemplates(next); localStorage.setItem('bas_custom_templates', JSON.stringify(next)); setCustomName(''); setCustomPrompt('');
  };

  const applyPreset = (presetId) => {
    const p = PROMPT_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setPrompt(p.prompt);
    setAudience(p.audience);
    setGoal(p.goal);
    setSlideCount(p.slideCount);
    setTone(p.tone);
    setMustHaveSections(p.mustHaveSections);
    setConstraints(p.constraints);
  };

  const onDragStartFav = (id) => setDraggingFav(String(id));
  const onDropFav = (overId) => {
    const over = String(overId); if (!draggingFav || draggingFav === over) return;
    const list = [...favoriteOrder.filter((x) => favorites.includes(x))];
    const from = list.indexOf(draggingFav); const to = list.indexOf(over);
    if (from < 0 || to < 0) return;
    const [it] = list.splice(from, 1); list.splice(to, 0, it);
    setFavoriteOrder(list); localStorage.setItem('bas_favorite_order', JSON.stringify(list)); setDraggingFav(null);
  };

  const progress = useMemo(() => Math.min(100, Math.round((slides.length / 10) * 100)), [slides.length]);

  if (showLanding) {
    return (
      <div className="landing">
        <div className="landing-hero">
          <h1>{APP_NAME}</h1>
          <p>Create stunning presentations with AI, 1250+ templates, publishing, and SaaS collaboration workflows.</p>
          <div className="landing-actions"><button className="primary" onClick={() => setShowLanding(false)}>Enter Studio</button></div>
        </div>
        <div className="landing-grid">
          <div className="landing-card"><h3>1250+ Formats</h3><p>Category-based template library with smart search.</p></div>
          <div className="landing-card"><h3>Drag & Drop Favorites</h3><p>Reorder your top templates for rapid creation.</p></div>
          <div className="landing-card"><h3>Publish & Share</h3><p>One-click public links for final decks.</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={{ '--bg': theme.bg, '--card': theme.card, '--text': theme.text, '--accent': brandPrimary || theme.accent, fontFamily: brandFont }}>
      <header className="topbar">
        <div className="logo">{APP_NAME}</div>
        <div className="prompt-wrap">
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe presentation topic..." />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="primary" onClick={() => generateDeck('v1')}>{llmLoading ? 'Generating...' : 'Generate'}</button>
            <button className="primary" onClick={() => generateDeck('v2')}>{llmLoading ? 'Generating...' : 'Generate v2 (Structured)'}</button>
          </div>
        </div>
        <div className="top-actions">
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option>Corporate</option>
            <option>Investor</option>
            <option>Creative</option>
            <option>Technical</option>
          </select>
          <input placeholder="audience" value={audience} onChange={(e) => setAudience(e.target.value)} />
          <input placeholder="goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <input type="number" min="4" max="14" placeholder="slides" value={slideCount} onChange={(e) => setSlideCount(e.target.value)} style={{ width: 88 }} />
          <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {!token ? <><button onClick={register}>Register</button><button onClick={login}>Login</button></> : <button onClick={logout}>Logout</button>}
        </div>
      </header>

      <div className="workspace">
        <aside className="left">
          <div className="panel-title">Slides</div>
          <input value={deckTitle} onChange={(e) => setDeckTitle(e.target.value)} placeholder="Deck title" style={{ width: '100%', marginBottom: 10, padding: 10 }} />
          <div className="stack">{slides.map((s, i) => <button key={s.id} className={`thumb ${s.id === active ? 'active' : ''}`} onClick={() => setActive(s.id)}><span>{i + 1}. {s.layout}</span><small>{s.title}</small></button>)}</div>
          <div className="row"><button onClick={() => addSlide()}>+ Slide</button><button onClick={duplicateSlide}>Duplicate</button><button onClick={removeSlide}>Delete</button></div>
          <div className="row" style={{ marginTop: 8 }}><button onClick={saveDeck}>Save</button><button onClick={publishDeck}>Publish</button><button onClick={exportPpt}>PPT</button></div>

          <div className="panel-title" style={{ marginTop: 16 }}>Prompt Builder</div>
          <select onChange={(e) => applyPreset(e.target.value)} defaultValue="" style={{ width: '100%', marginBottom: 8, padding: 10 }}>
            <option value="">Apply preset...</option>
            {PROMPT_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <textarea value={mustHaveSections} onChange={(e) => setMustHaveSections(e.target.value)} rows={2} style={{ width: '100%', marginBottom: 8, padding: 10 }} placeholder="Must-have sections (comma separated)" />
          <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={2} style={{ width: '100%', marginBottom: 8, padding: 10 }} placeholder="Constraints (style, format, business limits)" />
          <div className="row"><button onClick={() => generateDeck('v2')}>Generate from Builder</button></div>

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

          <div className="panel-title" style={{ marginTop: 12 }}>Brand Kit</div>
          <label>Brand Primary Color<input type="color" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} /></label>
          <label>Brand Font<input value={brandFont} onChange={(e) => setBrandFont(e.target.value)} placeholder="Inter, Arial" /></label>
          <label>Brand Logo URL<input value={brandLogo} onChange={(e) => setBrandLogo(e.target.value)} placeholder="https://..." /></label>
          {brandLogo ? <img src={brandLogo} alt="Brand logo" style={{ maxHeight: 48, marginBottom: 8, borderRadius: 6 }} /> : null}

          <div className="panel-title" style={{ marginTop: 12 }}>Version History</div>
          <select onChange={(e) => e.target.value && restoreVersion(e.target.value)} defaultValue="" style={{ width: '100%', marginBottom: 8 }}>
            <option value="">Restore snapshot...</option>
            {versionHistory.slice(0, 10).map((v) => <option key={v.id} value={v.id}>{new Date(v.at).toLocaleString()} — {v.title}</option>)}
          </select>

          <button onClick={exportJson}>Export JSON</button>
          <button onClick={exportPpt}>Export PPT</button>
          <button onClick={exportPdf}>Export PDF</button>
          <button onClick={improveSelectedSlide}>{llmLoading ? 'Improving...' : `Improve Slide (${tone})`}</button>
          <div className="health"><span>Deck Completeness</span><div className="bar"><i style={{ width: `${progress}%` }} /></div></div>
        </aside>
      </div>
    </div>
  );
}
