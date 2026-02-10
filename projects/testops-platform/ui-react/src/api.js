const API_KEY = localStorage.getItem('testops_api_key') || 'admin-token'

const api = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    ...options,
  })
  return res.json()
}

export const setApiKey = (k) => localStorage.setItem('testops_api_key', k)

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

export const getTenants = () => api('/tenants')
export const getTenantChannels = (tenantId) => api(`/tenants/${tenantId}/channels`)
export const saveTenantChannels = (tenantId, payload) => api(`/tenants/${tenantId}/channels`, {
  method: 'PUT',
  body: JSON.stringify(payload),
})

export const createJiraIssue = (payload) => api('/integrations/jira/create-issue', {
  method: 'POST',
  body: JSON.stringify(payload),
})

export const createTestRailRun = (payload) => api('/integrations/testrail/create-run', {
  method: 'POST',
  body: JSON.stringify(payload),
})

export const generateArtifacts = (payload) => api('/artifacts/generate', {
  method: 'POST',
  body: JSON.stringify(payload),
})

export const getWave3Executive = () => api('/wave3/analytics/executive')
export const listWave3Checkpoints = () => api('/wave3/remediation/checkpoint/list')
export const approveWave3Checkpoint = (checkpoint_id, actor = 'ui-approver') =>
  api('/wave3/remediation/checkpoint/approve', {
    method: 'POST',
    body: JSON.stringify({ checkpoint_id, actor }),
  })
