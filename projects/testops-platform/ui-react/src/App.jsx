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
  sendNativeChannelMessage, executeWave4Contract, analyzeWave4Drift, listWave4DriftReports,
  runWave4Fuzz, listWave4FuzzReports, runWave4Soak, listWave4SoakReports,
  getWave41AuthStatus, evalWave41Policy, getWave41QueueReadiness, verifyWave41QueueStartup,
  runWave5MobileCloud, getWave5SecretsStatus, runWave5Backup, listWave5Backups, testWave5Alert, sendWave5Alert,
  getWave6Controls, getWave6Retention, validateWave6Pii, getWave6SsoStatus, listWave6ScimUsers,
  createWave6ScimUser, deactivateWave6ScimUser, runWave6Drill, getWave6LatestDrill,
  listWave6Budgets, setWave6Budget, trackWave6Usage, getWave6Throttle,
  listLifecycleRequirements, createLifecycleRequirement, updateLifecycleRequirement, deleteLifecycleRequirement,
  generateLifecycleStrategy, generateLifecycleDesign, generateLifecycleTestCases, buildLifecycleTestPlan,
  mapLifecycleTestingTypes, executeLifecycle, getLifecycleState, saveLifecycleRun, listLifecycleRuns,
  pushLifecycleToJira, pushLifecycleToTestRail,
} from './api'

const TABS = ['Dashboard', 'Execution', 'Data', 'Integrations', 'QA Lifecycle', 'Quality', 'Enterprise', 'Admin', 'Logs']

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
  const [wave4ProviderUrl, setWave4ProviderUrl] = useState('http://localhost:8090')
  const [wave4ContractPath, setWave4ContractPath] = useState('requirements/sample-contract.json')
  const [wave4DriftReports, setWave4DriftReports] = useState([])
  const [wave4FuzzReports, setWave4FuzzReports] = useState([])
  const [wave4SoakReports, setWave4SoakReports] = useState([])
  const [wave41AuthStatus, setWave41AuthStatus] = useState(null)
  const [wave41PolicyInput, setWave41PolicyInput] = useState('{"counts":{"fail":0,"error":0},"critical_security_failures":0}')
  const [wave41QueueStatus, setWave41QueueStatus] = useState(null)
  const [wave41Channel, setWave41Channel] = useState('teams')
  const [wave5Provider, setWave5Provider] = useState('browserstack')
  const [wave5Device, setWave5Device] = useState('iPhone 13')
  const [wave5Secrets, setWave5Secrets] = useState(null)
  const [wave5Backups, setWave5Backups] = useState([])
  const [wave5AlertChannel, setWave5AlertChannel] = useState('webhook')
  const [wave6Controls, setWave6Controls] = useState(null)
  const [wave6Retention, setWave6Retention] = useState(null)
  const [wave6Sso, setWave6Sso] = useState(null)
  const [wave6ScimUsers, setWave6ScimUsers] = useState([])
  const [wave6Drill, setWave6Drill] = useState(null)
  const [wave6Budgets, setWave6Budgets] = useState({})
  const [wave6Scope, setWave6Scope] = useState('agent:playwright')
  const [lifecycleRequirements, setLifecycleRequirements] = useState([])
  const [lifecycleRuns, setLifecycleRuns] = useState([])
  const [lifecycleCurrent, setLifecycleCurrent] = useState({})
  const [lifecycleName, setLifecycleName] = useState('Checkout flow must complete under 2s')
  const [lifecycleDomain, setLifecycleDomain] = useState('functional')
  const [lifecycleRisk, setLifecycleRisk] = useState('high')

  const wsUrl = useMemo(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.hostname}:8090/ws/logs`
  }, [])

  useEffect(() => {
    ;(async () => {
      const [c, a, w, t, ex, tr, cp, af, tdp, etlp, etlr, w4d, w4f, w4s, a41, q41, lr, lrs] = await Promise.all([
        getChannels(), getAgents(), getWorkflows(), getTenants(), getWave3Executive(), getWave3Trends(), listWave3Checkpoints(),
        listArtifacts(), getTestdataProfiles(), getEtlProfiles(), getLastEtlReport(),
        listWave4DriftReports(), listWave4FuzzReports(), listWave4SoakReports(),
        getWave41AuthStatus(), getWave41QueueReadiness(),
        listLifecycleRequirements(), listLifecycleRuns(),
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
      setWave4DriftReports(w4d.reports || [])
      setWave4FuzzReports(w4f.reports || [])
      setWave4SoakReports(w4s.reports || [])
      setWave41AuthStatus(a41)
      setWave41QueueStatus(q41)
      setLifecycleRequirements(lr.requirements || [])
      setLifecycleRuns(lrs.runs || [])
      setWave5Secrets(await getWave5SecretsStatus())
      setWave5Backups((await listWave5Backups()).backups || [])
      setWave6Controls(await getWave6Controls({ rbac: true, jwt_auth: true, alerts: true, backup: true }))
      setWave6Retention(await getWave6Retention())
      setWave6Sso(await getWave6SsoStatus())
      setWave6ScimUsers((await listWave6ScimUsers()).users || [])
      setWave6Drill(await getWave6LatestDrill())
      setWave6Budgets((await listWave6Budgets()).budgets || {})
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

  const refreshLifecycle = async () => {
    const [lr, lrs] = await Promise.all([listLifecycleRequirements(), listLifecycleRuns()])
    setLifecycleRequirements(lr.requirements || [])
    setLifecycleRuns(lrs.runs || [])
  }

  const runLifecycleStep = async (step) => {
    const requirements = lifecycleRequirements
    const strategy = lifecycleCurrent.strategy || await generateLifecycleStrategy({ requirements })
    const design = lifecycleCurrent.design || await generateLifecycleDesign({ requirements, strategy })
    const testCases = lifecycleCurrent.test_cases || await generateLifecycleTestCases({ requirements, strategy, design })

    if (step === 'strategy') return setLifecycleCurrent((s) => ({ ...s, strategy }))
    if (step === 'design') return setLifecycleCurrent((s) => ({ ...s, strategy, design }))
    if (step === 'cases') return setLifecycleCurrent((s) => ({ ...s, strategy, design, test_cases: testCases }))

    const plan = lifecycleCurrent.plan || await buildLifecycleTestPlan({ requirements, test_cases: testCases })
    if (step === 'plan') return setLifecycleCurrent((s) => ({ ...s, strategy, design, test_cases: testCases, plan }))

    const types = lifecycleCurrent.types_mapping || await mapLifecycleTestingTypes({ requirements, test_cases: testCases })
    if (step === 'types') return setLifecycleCurrent((s) => ({ ...s, strategy, design, test_cases: testCases, plan, types_mapping: types }))

    const execution = await executeLifecycle({ suites: ['functional', 'api', 'security', 'non-functional'] })
    const state = await getLifecycleState({ requirements, run: { execution } })
    const next = { ...lifecycleCurrent, strategy, design, test_cases: testCases, plan, types_mapping: types, execution, state }
    setLifecycleCurrent(next)
    setOutput(JSON.stringify(next, null, 2))
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

        {activeTab === 'Dashboard' && (
          <div className="panel-grid">
            <Card title="Quick Run"><button onClick={onRunSuite}>Run Full Suite</button><button onClick={onRunAllAgents}>Run All Agents</button></Card>
            <Card title="Agent Command"><input value={message} onChange={(e) => setMessage(e.target.value)} style={{ width: '70%' }} /><button onClick={onSendMessage}>Send</button></Card>
            <Card title="Executive Trend"><div className="trend-row">{(trendPoints || []).map((p, i) => <div key={i} className="bar-wrap"><div className="bar" style={{ height: `${Math.max(4, Math.min(100, p.score))}%` }} /></div>)}</div></Card>
            <Card title="Domain Heatmap"><div className="panel-grid">{Object.entries(execSummary?.domains || {}).map(([d, v]) => { const risk = (v.fail || 0) + (v.error || 0); const cls = risk >= 3 ? 'risk-high' : risk >= 1 ? 'risk-med' : 'risk-low'; return <div key={d} className={`risk-card ${cls}`}><b>{d}</b><div>total={v.total} fail={v.fail} error={v.error}</div></div> })}</div></Card>
          </div>
        )}

        {activeTab === 'Execution' && (
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

        {activeTab === 'Data' && (
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

        {activeTab === 'QA Lifecycle' && <div className="panel-grid">
          <Card title="Step 1 — Add requirements">
            <input value={lifecycleName} onChange={(e) => setLifecycleName(e.target.value)} placeholder="Requirement title" />
            <select value={lifecycleDomain} onChange={(e) => setLifecycleDomain(e.target.value)}>
              <option value="functional">functional</option>
              <option value="api">api</option>
              <option value="non-functional">non-functional</option>
              <option value="security">security</option>
              <option value="mobile">mobile</option>
              <option value="etl">etl</option>
            </select>
            <select value={lifecycleRisk} onChange={(e) => setLifecycleRisk(e.target.value)}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            <button onClick={async () => {
              await createLifecycleRequirement({ title: lifecycleName, domain: lifecycleDomain, risk: lifecycleRisk, status: 'planned' })
              await refreshLifecycle()
            }}>Add</button>
            {(lifecycleRequirements || []).slice(-8).reverse().map((r) => (
              <div key={r.id} className="lifecycle-row">
                <code>{r.id}</code> {r.title} [{r.domain}/{r.risk}] v{r.version}
                <button onClick={async () => { await updateLifecycleRequirement(r.id, { status: 'approved' }); await refreshLifecycle() }}>Approve</button>
                <button onClick={async () => { await deleteLifecycleRequirement(r.id); await refreshLifecycle() }}>Delete</button>
              </div>
            ))}
          </Card>

          <Card title="Steps 2-7 — Wizard flow">
            <div className="wizard-steps">
              <button onClick={() => runLifecycleStep('strategy')}>2. Strategy</button>
              <button onClick={() => runLifecycleStep('design')}>3. Test design</button>
              <button onClick={() => runLifecycleStep('cases')}>4. Test cases</button>
              <button onClick={() => runLifecycleStep('plan')}>5. Test plan</button>
              <button onClick={() => runLifecycleStep('types')}>6. Testing types</button>
              <button onClick={() => runLifecycleStep('execute')}>7. Execute</button>
            </div>
            <pre>{JSON.stringify(lifecycleCurrent, null, 2)}</pre>
          </Card>

          <Card title="Step 8 — Review reports + traceability">
            <button onClick={async () => {
              const saved = await saveLifecycleRun({
                requirements: lifecycleRequirements,
                strategy: lifecycleCurrent.strategy,
                design: lifecycleCurrent.design,
                test_cases: lifecycleCurrent.test_cases,
                plan: lifecycleCurrent.plan,
                types_mapping: lifecycleCurrent.types_mapping,
                execution: lifecycleCurrent.execution,
              })
              setOutput(JSON.stringify(saved, null, 2))
              await refreshLifecycle()
            }}>Save Lifecycle Run</button>
            <button onClick={async () => setOutput(JSON.stringify(await pushLifecycleToJira({ summary: 'QA Lifecycle Review', description: 'Lifecycle run reviewed in UI' }), null, 2))}>Push Jira</button>
            <button onClick={async () => setOutput(JSON.stringify(await pushLifecycleToTestRail({ name: 'QA Lifecycle UI Run' }), null, 2))}>Push TestRail</button>
            <div className="lifecycle-row"><b>Prior runs:</b> {(lifecycleRuns || []).length}</div>
            {(lifecycleRuns || []).slice(0, 6).map((r) => <div key={r.run_id} className="lifecycle-row"><code>{r.run_id}</code> {r.created_at}</div>)}
          </Card>
        </div>}

        {activeTab === 'Quality' && <div className="panel-grid">
          <Card title="HITL Queue">{(hitlQueue || []).slice(-20).reverse().map((c) => <div key={c.id}><code>{c.id}</code> {c.title} {c.status !== 'APPROVED' && <button onClick={async () => { setOutput(JSON.stringify(await approveWave3Checkpoint(c.id, 'ui-approver'), null, 2)); refreshExecutive() }}>Approve</button>}</div>)}</Card>
          <Card title="Contract + Traceability"><input value={contractPath} onChange={(e) => setContractPath(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await validateContract(contractPath), null, 2))}>Validate Contract</button><input value={traceReqPath} onChange={(e) => setTraceReqPath(e.target.value)} /><input value={traceTestsPath} onChange={(e) => setTraceTestsPath(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await buildTraceability({ requirements_path: traceReqPath, tests_path: traceTestsPath }), null, 2))}>Build Traceability</button></Card>
        </div>}

        {activeTab === 'Quality' && <div className="panel-grid">
          <Card title="Flaky"><input value={flakyTestId} onChange={(e) => setFlakyTestId(e.target.value)} /><label>passed<input type="checkbox" checked={flakyPassed} onChange={(e) => setFlakyPassed(e.target.checked)} /></label><button onClick={async () => setOutput(JSON.stringify(await recordFlaky(flakyTestId, flakyPassed), null, 2))}>Record</button><button onClick={async () => setOutput(JSON.stringify(await listFlaky(), null, 2))}>List</button></Card>
          <Card title="Promotion"><input value={promotionFrom} onChange={(e) => setPromotionFrom(e.target.value)} /><input value={promotionTo} onChange={(e) => setPromotionTo(e.target.value)} /><input value={promotionCounts} onChange={(e) => setPromotionCounts(e.target.value)} /><button onClick={async () => { let counts = {}; try { counts = JSON.parse(promotionCounts) } catch {}; setOutput(JSON.stringify(await evalPromotion({ from: promotionFrom, to: promotionTo, counts }), null, 2)) }}>Evaluate</button></Card>
          <Card title="Visual + Perf + Chaos"><input value={visualName} onChange={(e) => setVisualName(e.target.value)} /><input value={visualPath} onChange={(e) => setVisualPath(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await compareVisual(visualName, visualPath), null, 2))}>Compare Visual</button><input value={perfSamples} onChange={(e) => setPerfSamples(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await perfPercentiles(perfSamples.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !Number.isNaN(x))), null, 2))}>P50/P95/P99</button><input value={chaosScenario} onChange={(e) => setChaosScenario(e.target.value)} /><button onClick={async () => setOutput(JSON.stringify(await runChaos(chaosScenario), null, 2))}>Run Chaos</button></Card>
        </div>}

        {activeTab === 'Enterprise' && <div className="panel-grid">
          <Card title="Contract Execution (Real Endpoint)">
            <input value={wave4ProviderUrl} onChange={(e) => setWave4ProviderUrl(e.target.value)} placeholder="Provider Base URL" />
            <input value={wave4ContractPath} onChange={(e) => setWave4ContractPath(e.target.value)} placeholder="Contract path" />
            <button onClick={async () => setOutput(JSON.stringify(await executeWave4Contract({ provider_base_url: wave4ProviderUrl, contract_path: wave4ContractPath }), null, 2))}>Execute Contract</button>
          </Card>
          <Card title="ETL Drift Monitor">
            <button onClick={async () => {
              const r = await analyzeWave4Drift({
                baseline: [{ amount: 100, status: 'ok' }, { amount: 110, status: 'ok' }, { amount: 95, status: 'ok' }],
                current: [{ amount: 190, status: 'ok' }, { amount: 170, status: 'error' }, { amount: 180, status: 'error' }],
                numeric_fields: ['amount'],
                categorical_fields: ['status'],
              })
              setOutput(JSON.stringify(r, null, 2))
              setWave4DriftReports((await listWave4DriftReports()).reports || [])
            }}>Run Drift Analysis</button>
            <div>Saved reports: <b>{wave4DriftReports.length}</b></div>
          </Card>
          <Card title="Security Fuzz + Soak">
            <button onClick={async () => {
              const r = await runWave4Fuzz({ target_base_url: wave4ProviderUrl, path: '/health', method: 'GET' })
              setOutput(JSON.stringify(r, null, 2))
              setWave4FuzzReports((await listWave4FuzzReports()).reports || [])
            }}>Run Fuzz</button>
            <button onClick={async () => {
              const r = await runWave4Soak({ duration_seconds: 2, interval_ms: 20, jitter_ms: 2 })
              setOutput(JSON.stringify(r, null, 2))
              setWave4SoakReports((await listWave4SoakReports()).reports || [])
            }}>Run Soak</button>
            <button onClick={async () => setOutput(JSON.stringify(await sendNativeChannelMessage({ channel: 'slack', chat_id: 'C123', text: 'Wave4 smoke message from UI' }), null, 2))}>Send Slack Smoke</button>
            <div>Fuzz reports: <b>{wave4FuzzReports.length}</b> | Soak reports: <b>{wave4SoakReports.length}</b></div>
          </Card>
        </div>}

        {activeTab === 'Enterprise' && <div className="panel-grid">
          <Card title="Auth Hardening Status">
            <button onClick={async () => { const r = await getWave41AuthStatus(); setWave41AuthStatus(r); setOutput(JSON.stringify(r, null, 2)) }}>Refresh Auth Mode</button>
            <pre>{JSON.stringify(wave41AuthStatus || {}, null, 2)}</pre>
          </Card>
          <Card title="Policy Adapter (OPA + local fallback)">
            <input value={wave41PolicyInput} onChange={(e) => setWave41PolicyInput(e.target.value)} />
            <button onClick={async () => {
              let payload = {}
              try { payload = JSON.parse(wave41PolicyInput) } catch {}
              const r = await evalWave41Policy(payload)
              setOutput(JSON.stringify(r, null, 2))
            }}>Evaluate Policy</button>
          </Card>
          <Card title="Queue Readiness + Channel Smoke">
            <button onClick={async () => {
              const r = await getWave41QueueReadiness()
              setWave41QueueStatus(r)
              setOutput(JSON.stringify(r, null, 2))
            }}>Check Readiness</button>
            <button onClick={async () => setOutput(JSON.stringify(await verifyWave41QueueStartup(), null, 2))}>Startup Verify</button>
            <div>Ready: <b>{String(wave41QueueStatus?.ready)}</b></div>
            <div>
              <select value={wave41Channel} onChange={(e) => setWave41Channel(e.target.value)}>
                <option value="teams">teams</option>
                <option value="slack">slack</option>
                <option value="discord">discord</option>
              </select>
              <button onClick={async () => setOutput(JSON.stringify(await sendNativeChannelMessage({ channel: wave41Channel, chat_id: '', text: 'Wave4.1 channel smoke from UI' }), null, 2))}>Send Smoke</button>
            </div>
          </Card>
        </div>}

        {activeTab === 'Enterprise' && <div className="panel-grid">
          <Card title="Mobile Cloud Run (BrowserStack/SauceLabs)">
            <select value={wave5Provider} onChange={(e) => setWave5Provider(e.target.value)}>
              <option value="browserstack">browserstack</option>
              <option value="saucelabs">saucelabs</option>
            </select>
            <input value={wave5Device} onChange={(e) => setWave5Device(e.target.value)} />
            <button onClick={async () => setOutput(JSON.stringify(await runWave5MobileCloud({ provider: wave5Provider, device: wave5Device }), null, 2))}>Run Cloud Smoke</button>
          </Card>
          <Card title="Secrets + Backup">
            <button onClick={async () => { const s = await getWave5SecretsStatus(); setWave5Secrets(s); setOutput(JSON.stringify(s, null, 2)) }}>Secrets Status</button>
            <button onClick={async () => { const b = await runWave5Backup('wave5-ui'); setWave5Backups((await listWave5Backups()).backups || []); setOutput(JSON.stringify(b, null, 2)) }}>Run Backup</button>
            <div>Backups: <b>{wave5Backups.length}</b></div>
            <pre>{JSON.stringify(wave5Secrets || {}, null, 2)}</pre>
          </Card>
          <Card title="Alerting + Channel Smokes">
            <select value={wave5AlertChannel} onChange={(e) => setWave5AlertChannel(e.target.value)}>
              <option value="webhook">webhook</option>
              <option value="pagerduty">pagerduty</option>
              <option value="opsgenie">opsgenie</option>
            </select>
            <button onClick={async () => setOutput(JSON.stringify(await testWave5Alert({ channel: wave5AlertChannel }), null, 2))}>Test Alert</button>
            <button onClick={async () => setOutput(JSON.stringify(await sendWave5Alert({ channel: wave5AlertChannel, payload: { summary: 'Wave5 manual alert', severity: 'critical' } }), null, 2))}>Send Alert</button>
            <button onClick={async () => setOutput(JSON.stringify(await sendNativeChannelMessage({ channel: 'whatsapp', chat_id: '', text: 'Wave5 WhatsApp smoke' }), null, 2))}>WhatsApp Smoke</button>
            <button onClick={async () => setOutput(JSON.stringify(await sendNativeChannelMessage({ channel: 'signal', chat_id: '', text: 'Wave5 Signal smoke' }), null, 2))}>Signal Smoke</button>
          </Card>
        </div>}

        {activeTab === 'Enterprise' && <div className="panel-grid">
          <Card title="Compliance Pack">
            <button onClick={async () => { const r = await getWave6Controls({ rbac: true, jwt_auth: true, sso_status: true, scim_audit: true, audit_log: true, alerts: true, backup_drill: true, immutable_retention: true, pii_masking: true, backup: true, restore_validation: true, drill_reports: true }); setWave6Controls(r); setOutput(JSON.stringify(r, null, 2)) }}>Refresh Controls Coverage</button>
            <button onClick={async () => { const r = await getWave6Retention(); setWave6Retention(r); setOutput(JSON.stringify(r, null, 2)) }}>Audit Retention Status</button>
            <button onClick={async () => setOutput(JSON.stringify(await validateWave6Pii({ user: { email: 'ceo@example.com', phone: '+1 555 010 9999' }, card: '4111 1111 1111 1111' }), null, 2))}>PII Masking Validate</button>
            <pre>{JSON.stringify(wave6Controls || {}, null, 2)}</pre>
          </Card>
          <Card title="SSO + SCIM">
            <button onClick={async () => { const r = await getWave6SsoStatus(); setWave6Sso(r); setOutput(JSON.stringify(r, null, 2)) }}>SSO Readiness</button>
            <button onClick={async () => { const r = await createWave6ScimUser({ id: 'u-ui', userName: 'ui.user@testops.local', displayName: 'UI User', active: true }); setOutput(JSON.stringify(r, null, 2)); setWave6ScimUsers((await listWave6ScimUsers()).users || []) }}>Create SCIM User</button>
            <button onClick={async () => { const r = await deactivateWave6ScimUser('u-ui'); setOutput(JSON.stringify(r, null, 2)); setWave6ScimUsers((await listWave6ScimUsers()).users || []) }}>Deactivate SCIM User</button>
            <div>SCIM users: <b>{wave6ScimUsers.length}</b></div>
            <pre>{JSON.stringify(wave6Sso || {}, null, 2)}</pre>
          </Card>
          <Card title="HA/DR + Cost Governance">
            <button onClick={async () => { const r = await runWave6Drill('ui'); setWave6Drill(r); setOutput(JSON.stringify(r, null, 2)) }}>Run HA/DR Drill</button>
            <button onClick={async () => { const r = await getWave6LatestDrill(); setWave6Drill(r); setOutput(JSON.stringify(r, null, 2)) }}>Latest Drill Report</button>
            <div>Latest drill: <b>{wave6Drill?.report?.drill_id || wave6Drill?.drill_id || 'N/A'}</b></div>
            <input value={wave6Scope} onChange={(e) => setWave6Scope(e.target.value)} placeholder="scope" />
            <button onClick={async () => { const r = await setWave6Budget({ scope: wave6Scope, daily_limit: 100, warning_threshold: 0.8 }); setOutput(JSON.stringify(r, null, 2)); setWave6Budgets((await listWave6Budgets()).budgets || {}) }}>Set Budget</button>
            <button onClick={async () => setOutput(JSON.stringify(await trackWave6Usage({ scope: wave6Scope, amount: 85, meta: { source: 'ui' } }), null, 2))}>Track Usage</button>
            <button onClick={async () => setOutput(JSON.stringify(await getWave6Throttle(wave6Scope), null, 2))}>Throttle Decision</button>
            <pre>{JSON.stringify(wave6Budgets || {}, null, 2)}</pre>
          </Card>
        </div>}

        {activeTab === 'Admin' && <Card title="Tenant Configuration"><div><select value={tenantId} onChange={(e) => onTenantLoad(e.target.value)}>{tenants.map((t) => <option key={t}>{t}</option>)}</select><button onClick={onTenantSave}>Save Config</button></div><div className="panel-grid">{Object.entries(tenantCfg.channels || {}).map(([name, cfg]) => <Card key={name} title={name}>{Object.entries(cfg).map(([k, v]) => <div key={k}><label>{k}</label><input value={String(v)} onChange={(e) => updateChannelField(name, k, e.target.value)} /></div>)}</Card>)}</div></Card>}

        {activeTab === 'Logs' && <div className="panel-grid"><Card title="Realtime Logs"><pre>{JSON.stringify(logs.slice(-25), null, 2)}</pre></Card><Card title="Output"><pre>{output}</pre></Card></div>}
      </main>
    </div>
  )
}
