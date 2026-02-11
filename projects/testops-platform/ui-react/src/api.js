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
export const listArtifacts = () => api('/artifacts/list')
export const readArtifact = (path) => api('/artifacts/read', {
  method: 'POST',
  body: JSON.stringify({ path }),
})
export const runDoctor = () => api('/doctor')

export const getWave3Executive = () => api('/wave3/analytics/executive')
export const getWave3Trends = () => api('/wave3/analytics/trends?limit=30')
export const listWave3Checkpoints = () => api('/wave3/remediation/checkpoint/list')

export const validateContract = (contract_path) => api('/wave3.1/contract/validate', {
  method: 'POST',
  body: JSON.stringify({ contract_path }),
})

export const buildTraceability = (payload = {}) => api('/wave3.1/traceability/build', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const approveWave3Checkpoint = (checkpoint_id, actor = 'ui-approver') =>
  api('/wave3/remediation/checkpoint/approve', {
    method: 'POST',
    body: JSON.stringify({ checkpoint_id, actor }),
  })

export const recordFlaky = (test_id, passed) => api('/wave3.2/flaky/record', {
  method: 'POST',
  body: JSON.stringify({ test_id, passed }),
})
export const listFlaky = () => api('/wave3.2/flaky/list')
export const evalPromotion = (payload) => api('/wave3.2/promotion/evaluate', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const compareVisual = (name, current_path) => api('/wave3.2/visual/compare', {
  method: 'POST',
  body: JSON.stringify({ name, current_path }),
})
export const perfPercentiles = (samples_ms) => api('/wave3.2/performance/percentiles', {
  method: 'POST',
  body: JSON.stringify({ samples_ms }),
})
export const runChaos = (scenario) => api('/wave3.2/chaos/run', {
  method: 'POST',
  body: JSON.stringify({ scenario }),
})

export const getEtlProfiles = () => api('/etl/profiles')
export const runEtl = (profile) => api('/etl/run', {
  method: 'POST',
  body: JSON.stringify({ profile }),
})
export const getLastEtlReport = () => api('/etl/last-report')

export const getTestdataProfiles = () => api('/testdata/profiles')
export const seedTestdata = (profile) => api('/testdata/seed', {
  method: 'POST',
  body: JSON.stringify({ profile }),
})
export const loadTestdata = (profile) => api('/testdata/load', {
  method: 'POST',
  body: JSON.stringify({ profile }),
})
export const generateTestdata = (profile, users, orders) => api('/testdata/generate', {
  method: 'POST',
  body: JSON.stringify({ profile, users, orders }),
})
export const resetTestdata = () => api('/testdata/reset', { method: 'POST' })
export const getTestdataStatus = () => api('/testdata/status')

export const sendNativeChannelMessage = (payload) => api('/channels/send', {
  method: 'POST',
  body: JSON.stringify(payload),
})

export const executeWave4Contract = (payload) => api('/wave4/contract/execute', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const analyzeWave4Drift = (payload) => api('/wave4/drift/analyze', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const listWave4DriftReports = () => api('/wave4/drift/reports')

export const runWave4Fuzz = (payload) => api('/wave4/security/fuzz', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const listWave4FuzzReports = () => api('/wave4/security/fuzz/reports')

export const runWave4Soak = (payload) => api('/wave4/performance/soak', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const listWave4SoakReports = () => api('/wave4/performance/soak/reports')

export const getWave41AuthStatus = () => api('/wave4.1/auth/status')
export const verifyWave41Auth = (token) => api('/wave4.1/auth/verify', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-API-Key': localStorage.getItem('testops_api_key') || 'admin-token' },
})
export const evalWave41Policy = (payload) => api('/wave4.1/policy/evaluate', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const getWave41QueueReadiness = () => api('/wave4.1/queue/readiness')
export const verifyWave41QueueStartup = () => api('/wave4.1/queue/startup-verify', { method: 'POST' })

export const runWave5MobileCloud = (payload) => api('/wave5/mobile/cloud-run', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const getWave5SecretsStatus = () => api('/wave5/secrets/status')
export const runWave5Backup = (label = 'wave5-ui') => api('/wave5/backup/run', {
  method: 'POST',
  body: JSON.stringify({ label }),
})
export const listWave5Backups = () => api('/wave5/backup/list')
export const testWave5Alert = (payload) => api('/wave5/alerts/test', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const sendWave5Alert = (payload) => api('/wave5/alerts/send', {
  method: 'POST',
  body: JSON.stringify(payload),
})
