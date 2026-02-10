import { useEffect, useMemo, useState } from 'react'
import Card from './components/Card'
import {
  getChannels, getAgents, getWorkflows, runSuite, runAllAgents, runOneAgent, runWorkflow,
  sendAgentMessage, getTenants, getTenantChannels, saveTenantChannels, setApiKey,
  createJiraIssue, createTestRailRun, generateArtifacts,
  getWave3Executive, getWave3Trends, listWave3Checkpoints, approveWave3Checkpoint,
  validateContract, buildTraceability,
  recordFlaky, listFlaky, evalPromotion, compareVisual, perfPercentiles, runChaos,
  listArtifacts, readArtifact, runDoctor,
  getTestdataProfiles, seedTestdata, loadTestdata, generateTestdata, resetTestdata, getTestdataStatus,
  getEtlProfiles, runEtl, getLastEtlReport,
} from './api'

const TABS = ['Overview', 'Runs', 'Data & ETL', 'Integrations', 'Governance', 'Advanced', 'Tenants', 'Logs']

export default function App() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [channels, setChannels] = useState([])
  const [agents, setAgents] = useState([])
  const [workflows, setWorkflows] = useState([])
  const [output, setOutput] = useState('Ready')
  const [message, setMessage] = useState('/help')
  const [apiKey, setApiKeyState] = useState(localStorage.getItem('testops_api_key') || 'admin-token')
  const [logs, setLogs] = useState([])
  const [tenants, setTenants] = useState([])
  const [tenantId, setTenantId] = useState('default')
  const [tenantCfg, setTenantCfg] = useState({ channels: {} })
  const [jiraSummary, setJiraSummary] = useState('TestOps generated issue')
  const [jiraDesc, setJiraDesc] = useState('Quality issue found in automated execution')
  const [trRunName, setTrRunName] = useState('TestOps Automated Run')
  const [artifactProduct, setArtifactProduct] = useState('TestOps Platform')
  const [execSummary, setExecSummary] = useState(null)
  const [trendPoints, setTrendPoints] = useState([])
  const [hitlQueue, setHitlQueue] = useState([])
  const [contractPath, setContractPath] = useState('requirements/sample-contract.json')
  const [traceReqPath, setTraceReqPath] = useState('requirements/requirements.json')
  const [traceTestsPath, setTraceTestsPath] = useState('artifacts/TESTCASES.md')
  const [flakyTestId, setFlakyTestId] = useState('TC-123')
  const [flakyPassed, setFlakyPassed] = useState(false)
  const [promotionFrom, setPromotionFrom] = useState('qa')
  const [promotionTo, setPromotionTo] = useState('prod')
  const [promotionCounts, setPromotionCounts] = useState('{"fail":0,"error":0}')
  const [visualName, setVisualName] = useState('home')
  const [visualPath, setVisualPath] = useState('reports/test-snap.bin')
  const [perfSamples, setPerfSamples] = useState('10,20,30,40,50,60,70,80,90,100')
  const [chaosScenario, setChaosScenario] = useState('latency-spike')
  const [artifactFiles, setArtifactFiles] = useState([])
  const [selectedArtifact, setSelectedArtifact] = useState('')
  const [testdataProfiles, setTestdataProfiles] = useState([])
  const [testdataProfile, setTestdataProfile] = useState('default')
  const [tdUsers, setTdUsers] = useState(10)
  const [tdOrders, setTdOrders] = useState(20)
  const [etlProfiles, setEtlProfiles] = useState([])
  const [etlProfile, setEtlProfile] = useState('retail_orders')
  const [etlReport, setEtlReport] = useState(null)

  const wsUrl = useMemo(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.hostname}:8090/ws/logs`
  }, [])

  useEffect(() => {
    ;(async () => {
      const [c, a, w, t, ex, tr, cp, af, tdp, etlp, etlr] = await Promise.all([
        getChannels(), getAgents(), getWorkflows(), getTenants(), getWave3Executive(), getWave3Trends(), listWave3Checkpoints(),
        listArtifacts(), getTestdataProfiles(), getEtlProfiles(), getLastEtlReport(),
      ])
      setChannels(c.supported || [])
      setAgents(a.agents || [])
      setWorkflows(w.workflows || [])
      setExecSummary(ex)
      setTrendPoints(tr.points || [])
      setHitlQueue(cp.checkpoints || [])
      setArtifactFiles(af.files || [])
      setSelectedArtifact((af.files || [])[0] || '')
      setTestdataProfiles(tdp.profiles || [])
      setTestdataProfile((tdp.profiles || [])[0] || 'default')
      setEtlProfiles(etlp.profiles || [])
      setEtlProfile((etlp.profiles || [])[0]?.name || 'retail_orders')
      if (etlr?.ok) setEtlReport(etlr)
      const tenantList = t.tenants || []
      setTenants(tenantList)
      const first = tenantList[0] || 'default'
      setTenantId(first)
      const tc = await getTenantChannels(first)
      setTenantCfg(tc.config || { channels: {} })
    })()
  }, [])

  useEffect(() => {
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (evt) => {
      try {
        const d = JSON.parse(evt.data)
        setLogs(d.events || [])
      } catch {}
    }
    return () => ws.close()
  }, [wsUrl])

  const onRunSuite = async () => setOutput(JSON.stringify(await runSuite(), null, 2))
  const onRunAllAgents = async () => setOutput(JSON.stringify(await runAllAgents(), null, 2))
  const onRunAgent = async (a) => setOutput(JSON.stringify(await runOneAgent(a), null, 2))
  const onRunWorkflow = async (wf) => setOutput(JSON.stringify(await runWorkflow(wf), null, 2))
  const onSendMessage = async () => setOutput(JSON.stringify(await sendAgentMessage(message), null, 2))

  const onApiKeySave = () => {
    setApiKey(apiKey)
    localStorage.setItem('testops_api_key', apiKey)
    setOutput('API key saved. Refresh to re-auth all fetches.')
  }

  const onTenantLoad = async (id) => {
    setTenantId(id)
    const tc = await getTenantChannels(id)
    setTenantCfg(tc.config || { channels: {} })
  }
  const onTenantSave = async () => setOutput(JSON.stringify(await saveTenantChannels(tenantId, tenantCfg), null, 2))

  const refreshExecutive = async () => {
    const [ex, tr, cp] = await Promise.all([getWave3Executive(), getWave3Trends(), listWave3Checkpoints()])
    setExecSummary(ex)
    setTrendPoints(tr.points || [])
    setHitlQueue(cp.checkpoints || [])
  }

  const runEtlNow = async () => {
    const res = await runEtl(etlProfile)
    setEtlReport(res)
    setOutput(JSON.stringify(res, null, 2))
  }

  const updateChannelField = (name, key, value) => {
    setTenantCfg((prev) => ({
      ...prev,
      channels: {
        ...(prev.channels || {}),
        [name]: { ...((prev.channels || {})[name] || {}), [key]: value },
      },
    }))
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">✦ TestOps</div>
        {TABS.map((tab) => (
          <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </aside>

      <main className="main">
        <header className="hero">
          <div>
            <h1>AI Testing Command Center</h1>
            <p>Elegant, unified quality operations for functional, non-functional, security, ETL and release governance.</p>
          </div>
          <div className="hero-actions">
            <input value={apiKey} onChange={(e) => setApiKeyState(e.target.value)} />
            <button onClick={onApiKeySave}>Save API Key</button>
          </div>
        </header>

        <section className="kpi-strip">
          <div className="kpi"><span>Channels</span><strong>{channels.length}</strong></div>
          <div className="kpi"><span>Agents</span><strong>{agents.length}</strong></div>
          <div className="kpi"><span>Workflows</span><strong>{workflows.length}</strong></div>
          <div className="kpi"><span>Pass Rate</span><strong>{Math.round((execSummary?.kpi?.pass_rate || 0) * 100)}%</strong></div>
          <div className="kpi"><span>ETL Status</span><strong>{etlReport?.status || 'N/A'}</strong></div>
        </section>

        {activeTab === 'Overview' && (
          <div className="panel-grid">
            <Card title="Quick Run"><button onClick={onRunSuite}>Run Full Suite</button><button onClick={onRunAllAgents}>Run All Agents</button></Card>
            <Card title="Agent Command"><input value={message} onChange={(e) => setMessage(e.target.value)} style={{ width: '70%' }} /><button onClick={onSendMessage}>Send</button></Card>
            <Card title="Executive Trend"><div className="trend-row">{(trendPoints || []).map((p, i) => <div key={i} className="bar-wrap"><div className="bar" style={{ height: `${Math.max(4, Math.min(100, p.score))}%` }} /></div>)}</div></Card>
            <Card title="Domain Heatmap"><div className="panel-grid">{Object.entries(execSummary?.domains || {}).map(([d, v]) => { const risk = (v.fail || 0) + (v.error || 0); const cls = risk >= 3 ? 'risk-high' : risk >= 1 ? 'risk-med' : 'risk-low'; return <div key={d} className={`risk-card ${cls}`}><b>{d}</b><div>total={v.total} fail={v.fail} error={v.error}</div></div> })}</div></Card>
          </div>
        )}

        {activeTab === 'Runs' && (
          <div className="panel-grid">
            <Card title="Agents">{agents.map((a) => <div key={a}>{a} <button onClick={() => onRunAgent(a)}>Run</button></div>)}</Card>
            <Card title="Workflows">{workflows.map((w) => <div key={w}><code>{w}</code> <button onClick={() => onRunWorkflow(w)}>Run</button></div>)}</Card>
            <Card title="Doctor & Artifacts">
              <button onClick={async () => setOutput(JSON.stringify(await runDoctor(), null, 2))}>Run Doctor</button>
              <button onClick={async () => { const af = await listArtifacts(); setArtifactFiles(af.files || []); setOutput(JSON.stringify(af, null, 2)) }}>Refresh Artifacts</button>
              <div><select value={selectedArtifact} onChange={(e) => setSelectedArtifact(e.target.value)}>{artifactFiles.map((f) => <option key={f}>{f}</option>)}</select><button onClick={async () => setOutput(JSON.stringify(await readArtifact(selectedArtifact), null, 2))}>Read</button></div>
            </Card>
          </div>
        )}

        {activeTab === 'Data & ETL' && (
          <div className="panel-grid">
            <Card title="ETL Validation Module">
              <div><select value={etlProfile} onChange={(e) => setEtlProfile(e.target.value)}>{etlProfiles.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}</select><button onClick={runEtlNow}>Run ETL Checks</button></div>
              <div className="etl-summary">
                <span>Status: <b>{etlReport?.status || 'N/A'}</b></span>
                <span>Checks: <b>{etlReport?.summary?.total_checks || 0}</b></span>
                <span>Pass: <b>{etlReport?.summary?.pass || 0}</b></span>
                <span>Fail: <b>{etlReport?.summary?.fail || 0}</b></span>
              </div>
            </Card>
            <Card title="Test Data Management">
              <select value={testdataProfile} onChange={(e) => setTestdataProfile(e.target.value)}>{testdataProfiles.map((p) => <option key={p}>{p}</option>)}</select>
              <button onClick={async () => setOutput(JSON.stringify(await seedTestdata(testdataProfile), null, 2))}>Seed</button>
              <button onClick={async () => setOutput(JSON.stringify(await loadTestdata(testdataProfile), null, 2))}>Load</button>
              <button onClick={async () => setOutput(JSON.stringify(await resetTestdata(), null, 2))}>Reset</button>
              <div><input value={tdUsers} onChange={(e) => setTdUsers(e.target.value)} /><input value={tdOrders} onChange={(e) => setTdOrders(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await generateTestdata(testdataProfile, Number(tdUsers), Number(tdOrders)), null, 2))}>Generate</button></div>
              <button onClick={async () => setOutput(JSON.stringify({ profiles: await getTestdataProfiles(), status: await getTestdataStatus() }, null, 2))}>Refresh Status</button>
            </Card>
          </div>
        )}

        {activeTab === 'Integrations' && <div className="panel-grid">
          <Card title="Jira"><input value={jiraSummary} onChange={(e) => setJiraSummary(e.target.value)} /><input value={jiraDesc} onChange={(e) => setJiraDesc(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await createJiraIssue({ summary: jiraSummary, description: jiraDesc, issue_type: 'Task' }), null, 2))}>Create Jira Issue</button></Card>
          <Card title="TestRail"><input value={trRunName} onChange={(e) => setTrRunName(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await createTestRailRun({ name: trRunName }), null, 2))}>Create TestRail Run</button></Card>
          <Card title="QA Artifacts"><input value={artifactProduct} onChange={(e) => setArtifactProduct(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await generateArtifacts({ product_name: artifactProduct }), null, 2))}>Generate</button></Card>
        </div>}

        {activeTab === 'Governance' && <div className="panel-grid">
          <Card title="HITL Queue">{(hitlQueue || []).slice(-20).reverse().map((c) => <div key={c.id}><code>{c.id}</code> {c.title} {c.status !== 'APPROVED' && <button onClick={async () => { setOutput(JSON.stringify(await approveWave3Checkpoint(c.id, 'ui-approver'), null, 2)); refreshExecutive() }}>Approve</button>}</div>)}</Card>
          <Card title="Contract + Traceability"><input value={contractPath} onChange={(e) => setContractPath(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await validateContract(contractPath), null, 2))}>Validate Contract</button><input value={traceReqPath} onChange={(e) => setTraceReqPath(e.target.value)} /><input value={traceTestsPath} onChange={(e) => setTraceTestsPath(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await buildTraceability({ requirements_path: traceReqPath, tests_path: traceTestsPath }), null, 2))}>Build Traceability</button></Card>
        </div>}

        {activeTab === 'Advanced' && <div className="panel-grid">
          <Card title="Flaky"><input value={flakyTestId} onChange={(e) => setFlakyTestId(e.target.value)} /><label>passed<input type="checkbox" checked={flakyPassed} onChange={(e) => setFlakyPassed(e.target.checked)} /></label><button onClick={async () => setOutput(JSON.stringify(await recordFlaky(flakyTestId, flakyPassed), null, 2))}>Record</button><button onClick={async () => setOutput(JSON.stringify(await listFlaky(), null, 2))}>List</button></Card>
          <Card title="Promotion"><input value={promotionFrom} onChange={(e) => setPromotionFrom(e.target.value)} /><input value={promotionTo} onChange={(e) => setPromotionTo(e.target.value)} /><input value={promotionCounts} onChange={(e) => setPromotionCounts(e.target.value)} /><button onClick={async () => { let counts = {}; try { counts = JSON.parse(promotionCounts) } catch {}; setOutput(JSON.stringify(await evalPromotion({ from: promotionFrom, to: promotionTo, counts }), null, 2)) }}>Evaluate</button></Card>
          <Card title="Visual + Perf + Chaos"><input value={visualName} onChange={(e) => setVisualName(e.target.value)} /><input value={visualPath} onChange={(e) => setVisualPath(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await compareVisual(visualName, visualPath), null, 2))}>Compare Visual</button><input value={perfSamples} onChange={(e) => setPerfSamples(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await perfPercentiles(perfSamples.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !Number.isNaN(x))), null, 2))}>P50/P95/P99</button><input value={chaosScenario} onChange={(e) => setChaosScenario(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await runChaos(chaosScenario), null, 2))}>Run Chaos</button></Card>
        </div>}

        {activeTab === 'Tenants' && <Card title="Multi-tenant Channel Config"><div><select value={tenantId} onChange={(e) => onTenantLoad(e.target.value)}>{tenants.map((t) => <option key={t}>{t}</option>)}</select><button onClick={onTenantSave}>Save Config</button></div><div className="panel-grid">{Object.entries(tenantCfg.channels || {}).map(([name, cfg]) => <Card key={name} title={name}>{Object.entries(cfg).map(([k, v]) => <div key={k}><label>{k}</label><input value={String(v)} onChange={(e) => updateChannelField(name, k, e.target.value)} /></div>)}</Card>)}</div></Card>}

        {activeTab === 'Logs' && <div className="panel-grid"><Card title="Realtime Logs"><pre>{JSON.stringify(logs.slice(-25), null, 2)}</pre></Card><Card title="Output"><pre>{output}</pre></Card></div>}
      </main>
    </div>
  )
}
