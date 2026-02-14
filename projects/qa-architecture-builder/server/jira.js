const { run, all } = require('./db');

const JIRA_MOCK_MODE = process.env.JIRA_MOCK_MODE !== 'false';

async function logSync({ boardId = null, direction, mode, status, details }) {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO jira_sync_logs (board_id, direction, mode, status, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [boardId, direction, mode, status, JSON.stringify(details || {}), now]
  );
}

async function pushToJira(board) {
  if (JIRA_MOCK_MODE) {
    const payload = {
      mocked: true,
      action: 'push',
      boardId: board.id,
      jiraIssueKeys: ['QA-101', 'QA-102'],
      message: 'Mock push completed',
    };
    await logSync({ boardId: board.id, direction: 'push', mode: 'mock', status: 'success', details: payload });
    return payload;
  }

  const payload = { mocked: false, action: 'push', boardId: board.id, message: 'Stub for real Jira push integration' };
  await logSync({ boardId: board.id, direction: 'push', mode: 'stub', status: 'success', details: payload });
  return payload;
}

async function pullFromJira(boardId) {
  if (JIRA_MOCK_MODE) {
    const payload = {
      mocked: true,
      action: 'pull',
      boardId,
      importedTickets: [
        { key: 'QA-501', summary: 'Regression readiness gate' },
        { key: 'QA-502', summary: 'Performance baseline run' }
      ],
      message: 'Mock pull completed',
    };
    await logSync({ boardId, direction: 'pull', mode: 'mock', status: 'success', details: payload });
    return payload;
  }

  const payload = { mocked: false, action: 'pull', boardId, message: 'Stub for real Jira pull integration' };
  await logSync({ boardId, direction: 'pull', mode: 'stub', status: 'success', details: payload });
  return payload;
}

async function getSyncHealth(boardId) {
  const rows = await all(
    `SELECT id, board_id, direction, mode, status, details_json, created_at
     FROM jira_sync_logs
     WHERE (? IS NULL OR board_id = ?)
     ORDER BY id DESC
     LIMIT 50`,
    [boardId || null, boardId || null]
  );

  return rows.map((r) => ({
    ...r,
    details: (() => {
      try { return JSON.parse(r.details_json || '{}'); } catch { return {}; }
    })()
  }));
}

module.exports = { pushToJira, pullFromJira, getSyncHealth, JIRA_MOCK_MODE };
