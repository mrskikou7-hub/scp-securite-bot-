const { Pool } = require('pg');

// Connexion PostgreSQL (Railway injecte DATABASE_URL automatiquement)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Initialise la table si elle n'existe pas
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agents (
      user_id TEXT PRIMARY KEY,
      username TEXT,
      total_ms BIGINT DEFAULT 0,
      in_service BOOLEAN DEFAULT FALSE,
      start_time BIGINT DEFAULT NULL,
      lien_appel TEXT DEFAULT NULL
    )
  `);
  console.log('✅ Base de données initialisée !');
}

async function getAgent(userId) {
  const res = await pool.query('SELECT * FROM agents WHERE user_id = $1', [userId]);
  if (res.rows.length === 0) {
    await pool.query(
      'INSERT INTO agents (user_id, username, total_ms, in_service, start_time, lien_appel) VALUES ($1, $2, 0, FALSE, NULL, NULL)',
      [userId, '']
    );
    return { totalMs: 0, inService: false, startTime: null, username: '', lienAppel: null };
  }
  const r = res.rows[0];
  return {
    totalMs: parseInt(r.total_ms),
    inService: r.in_service,
    startTime: r.start_time ? parseInt(r.start_time) : null,
    username: r.username,
    lienAppel: r.lien_appel
  };
}

async function setAgent(userId, data) {
  const current = await getAgent(userId);
  const merged = { ...current, ...data };
  await pool.query(
    `INSERT INTO agents (user_id, username, total_ms, in_service, start_time, lien_appel)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       username = $2, total_ms = $3, in_service = $4, start_time = $5, lien_appel = $6`,
    [userId, merged.username, merged.totalMs, merged.inService, merged.startTime, merged.lienAppel]
  );
}

async function getAllAgents() {
  const res = await pool.query('SELECT * FROM agents');
  const agents = {};
  for (const r of res.rows) {
    agents[r.user_id] = {
      totalMs: parseInt(r.total_ms),
      inService: r.in_service,
      startTime: r.start_time ? parseInt(r.start_time) : null,
      username: r.username,
      lienAppel: r.lien_appel
    };
  }
  return agents;
}

module.exports = { initDB, getAgent, setAgent, getAllAgents };
