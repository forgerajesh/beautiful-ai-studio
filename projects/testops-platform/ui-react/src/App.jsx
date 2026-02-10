import { useEffect, useState } from 'react'
import Card from './components/Card'
import { getChannels, getAgents, getWorkflows, runSuite, runAllAgents, runOneAgent, runWorkflow, sendAgentMessage } from './api'

export default function App() {
  const [channels, setChannels] = useState([])
  const [agents, setAgents] = useState([])
  const [workflows, setWorkflows] = useState([])
  const [output, setOutput] = useState('Ready')
  const [message, setMessage] = useState('/help')

  useEffect(() => {
    ;(async () => {
      const c = await getChannels()
      const a = await getAgents()
      const w = await getWorkflows()
      setChannels(c.supported || [])
      setAgents(a.agents || [])
      setWorkflows(w.workflows || [])
    })()
  }, [])

  const onRunSuite = async () => setOutput(JSON.stringify(await runSuite(), null, 2))
  const onRunAllAgents = async () => setOutput(JSON.stringify(await runAllAgents(), null, 2))
  const onRunAgent = async (a) => setOutput(JSON.stringify(await runOneAgent(a), null, 2))
  const onRunWorkflow = async (wf) => setOutput(JSON.stringify(await runWorkflow(wf), null, 2))
  const onSendMessage = async () => setOutput(JSON.stringify(await sendAgentMessage(message), null, 2))

  return (
    <div className="container">
      <h1>TestOps React Control Center</h1>
      <p>One-stop testing product: channels + tools (agents) + workflows</p>

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

      <Card title="Output">
        <pre>{output}</pre>
      </Card>
    </div>
  )
}
