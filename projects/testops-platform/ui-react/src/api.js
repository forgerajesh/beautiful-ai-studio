const api = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return res.json()
}

export const getChannels = () => api('/channels')
export const getAgents = () => api('/agents')
export const getWorkflows = () => api('/workflows')
export const runSuite = () => api('/run', { method: 'POST' })
export const runAllAgents = () => api('/agent/run', { method: 'POST', body: JSON.stringify({}) })
export const runOneAgent = (agent) => api('/agent/run', { method: 'POST', body: JSON.stringify({ agent }) })
export const runWorkflow = (workflow_path) => api('/workflows/run', { method: 'POST', body: JSON.stringify({ workflow_path }) })
export const sendAgentMessage = (text, channel = 'telegram') => api('/agent/message', {
  method: 'POST',
  body: JSON.stringify({ channel, text, user_id: 'ui-user', chat_id: 'ui-chat' })
})
