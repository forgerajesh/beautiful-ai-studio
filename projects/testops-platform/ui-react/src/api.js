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
