import { useEffect, useMemo, useState } from 'react'
import Card from './components/Card'
import {
  getChannels, getAgents, getWorkflows, runSuite, runAllAgents, runOneAgent, runWorkflow,
  sendAgentMessage, getTenants, getTenantChannels, saveTenantChannels, setApiKey,
  createJiraIssue, createTestRailRun, generateArtifacts,
  getWave3Executive, getWave3Trends, listWave3Checkpoints, approveWave3Checkpoint,
  validateContract, buildTraceability,
} from './api'

export default function App() {
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

  const wsUrl = useMemo(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.hostname}:8090/ws/logs`
  }, [])

  useEffect(() => {
    ;(async () => {
      const c = await getChannels()
      const a = await getAgents()
      const w = await getWorkflows()
      const t = await getTenants()
      const ex = await getWave3Executive()
      const tr = await getWave3Trends()
      const cp = await listWave3Checkpoints()
      setChannels(c.supported || [])
      setAgents(a.agents || [])
      setWorkflows(w.workflows || [])
      setExecSummary(ex)
      setTrendPoints(tr.points || [])
      setHitlQueue(cp.checkpoints || [])
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

  const onTenantSave = async () => {
    const res = await saveTenantChannels(tenantId, tenantCfg)
    setOutput(JSON.stringify(res, null, 2))
  }

  const onCreateJira = async () => {
    const res = await createJiraIssue({ summary: jiraSummary, description: jiraDesc, issue_type: 'Task' })
    setOutput(JSON.stringify(res, null, 2))
  }

  const onCreateTestRail = async () => {
    const res = await createTestRailRun({ name: trRunName })
    setOutput(JSON.stringify(res, null, 2))
  }

  const onGenerateArtifacts = async () => {
    const res = await generateArtifacts({ product_name: artifactProduct })
    setOutput(JSON.stringify(res, null, 2))
  }

  const refreshExecutive = async () => {
    const ex = await getWave3Executive()
    const tr = await getWave3Trends()
    const cp = await listWave3Checkpoints()
    setExecSummary(ex)
    setTrendPoints(tr.points || [])
    setHitlQueue(cp.checkpoints || [])
    setOutput('Wave3 executive dashboard refreshed')
  }

  const approveCheckpoint = async (id) => {
    const res = await approveWave3Checkpoint(id, 'ui-approver')
    setOutput(JSON.stringify(res, null, 2))
    await refreshExecutive()
  }

  const onValidateContract = async () => {
    const res = await validateContract(contractPath)
    setOutput(JSON.stringify(res, null, 2))
  }

  const onBuildTraceability = async () => {
    const res = await buildTraceability({ requirements_path: traceReqPath, tests_path: traceTestsPath })
    setOutput(JSON.stringify(res, null, 2))
  }

  const updateChannelField = (name, key, value) => {
    setTenantCfg((prev) => ({
      ...prev,
      channels: {
        ...(prev.channels || {}),
        [name]: {
          ...((prev.channels || {})[name] || {}),
          [key]: value,
        },
      },
    }))
  }

  return (
    <div className="container">
      <h1>TestOps React Control Center</h1>
      <p>One-stop testing product: channels + tools (agents) + workflows + RBAC + realtime logs + Jira/TestRail</p>

      <Card title="Auth / RBAC">
        <input value={apiKey} onChange={(e) => setApiKeyState(e.target.value)} style={{ width: '50%' }} />
        <button onClick={onApiKeySave}>Save API Key</button>
        <div style={{ marginTop: 8, fontSize: 12 }}>Use: admin-token | operator-token | viewer-token</div>
      </Card>

      <div className="grid">
        <Card title="Platform Runs">
          <button onClick={onRunSuite}>Run Full Suite</button>
          <button onClick={onRunAllAgents}>Run All Agents</button>
        </Card>

        <Card title="Channels">
          <ul>{channels.map((c) => <li key={c}>{c}</li>)}</ul>
        </Card>

        <Card title="Tools (Testing Agents)">
          <ul>
            {agents.map((a) => (
              <li key={a}>
                {a} <button onClick={() => onRunAgent(a)}>Run</button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Workflows (Playwright)">
          <ul>
            {workflows.map((w) => (
              <li key={w}>
                <code>{w}</code> <button onClick={() => onRunWorkflow(w)}>Run</button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Agent Command">
        <input value={message} onChange={(e) => setMessage(e.target.value)} style={{ width: '70%' }} />
        <button onClick={onSendMessage}>Send</button>
      </Card>

      <Card title="Jira Integration">
        <div><input value={jiraSummary} onChange={(e) => setJiraSummary(e.target.value)} style={{ width: '80%' }} /></div>
        <div style={{ marginTop: 8 }}><input value={jiraDesc} onChange={(e) => setJiraDesc(e.target.value)} style={{ width: '80%' }} /></div>
        <button onClick={onCreateJira}>Create Jira Issue</button>
      </Card>

      <Card title="TestRail Integration">
        <input value={trRunName} onChange={(e) => setTrRunName(e.target.value)} style={{ width: '80%' }} />
        <button onClick={onCreateTestRail}>Create TestRail Run</button>
      </Card>

      <Card title="Generate QA Artifacts">
        <input value={artifactProduct} onChange={(e) => setArtifactProduct(e.target.value)} style={{ width: '80%' }} />
        <button onClick={onGenerateArtifacts}>Generate Testcases/Testplan/Strategy</button>
      </Card>

      <Card title="Multi-tenant Channel Config">
        <div>
          <label>Tenant: </label>
          <select value={tenantId} onChange={(e) => onTenantLoad(e.target.value)}>
            {tenants.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={onTenantSave}>Save Config</button>
        </div>
        <div className="grid" style={{ marginTop: 10 }}>
          {Object.entries(tenantCfg.channels || {}).map(([name, cfg]) => (
            <Card key={name} title={name}>
              {Object.entries(cfg).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 6 }}>
                  <label>{k}: </label>
                  <input value={String(v)} onChange={(e) => updateChannelField(name, k, e.target.value)} style={{ width: '60%' }} />
                </div>
              ))}
            </Card>
          ))}
        </div>
      </Card>

      <Card title="Wave3 Executive Dashboard">
        <button onClick={refreshExecutive}>Refresh Executive Summary</button>
        {execSummary?.kpi ? (
          <div className="grid" style={{ marginTop: 10 }}>
            <Card title="Pass Rate"><h2>{Math.round((execSummary.kpi.pass_rate || 0) * 100)}%</h2></Card>
            <Card title="Total"><h2>{execSummary.kpi.total}</h2></Card>
            <Card title="Fail"><h2>{execSummary.kpi.fail}</h2></Card>
            <Card title="Error"><h2>{execSummary.kpi.error}</h2></Card>
          </div>
        ) : <div style={{ marginTop: 8 }}>No executive summary yet. Run suite then refresh.</div>}

        <h4 style={{ marginTop: 14 }}>Pass-rate Trend (Score)</h4>
        <div className="trend-row">
          {(trendPoints || []).map((p, i) => (
            <div key={i} className="bar-wrap" title={`${p.ts || ''} | score=${p.score}`}>
              <div className="bar" style={{ height: `${Math.max(4, Math.min(100, p.score))}%` }} />
            </div>
          ))}
        </div>

        <h4 style={{ marginTop: 14 }}>Domain Risk Heatmap</h4>
        <div className="grid">
          {Object.entries(execSummary?.domains || {}).map(([d, v]) => {
            const risk = (v.fail || 0) + (v.error || 0)
            const cls = risk >= 3 ? 'risk-high' : risk >= 1 ? 'risk-med' : 'risk-low'
            return (
              <div key={d} className={`risk-card ${cls}`}>
                <b>{d}</b>
                <div>total={v.total} fail={v.fail} error={v.error}</div>
              </div>
            )
          })}
        </div>

        <h4>HITL Queue</h4>
        <ul>
          {(hitlQueue || []).slice(-20).reverse().map((c) => (
            <li key={c.id}>
              <code>{c.id}</code> | {c.title} | status={c.status}
              {c.status !== 'APPROVED' && <button onClick={() => approveCheckpoint(c.id)}>Approve</button>}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Wave3.1 Testing Hardening">
        <h4>Contract Validation</h4>
        <input value={contractPath} onChange={(e) => setContractPath(e.target.value)} style={{ width: '80%' }} />
        <button onClick={onValidateContract}>Validate Contract</button>

        <h4 style={{ marginTop: 12 }}>Traceability Matrix</h4>
        <div><input value={traceReqPath} onChange={(e) => setTraceReqPath(e.target.value)} style={{ width: '80%' }} /></div>
        <div style={{ marginTop: 8 }}><input value={traceTestsPath} onChange={(e) => setTraceTestsPath(e.target.value)} style={{ width: '80%' }} /></div>
        <button onClick={onBuildTraceability}>Build Traceability</button>
      </Card>

      <Card title="Realtime Logs (WebSocket)">
        <pre>{JSON.stringify(logs.slice(-20), null, 2)}</pre>
      </Card>

      <Card title="Output">
        <pre>{output}</pre>
      </Card>
    </div>
  )
}
