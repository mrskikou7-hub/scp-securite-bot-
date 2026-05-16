const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/service.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const empty = { agents: {} };
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getAgent(userId) {
  const db = loadDB();
  if (!db.agents[userId]) {
    db.agents[userId] = { totalMs: 0, inService: false, startTime: null, username: '' };
    saveDB(db);
  }
  return db.agents[userId];
}

function setAgent(userId, data) {
  const db = loadDB();
  db.agents[userId] = { ...db.agents[userId], ...data };
  saveDB(db);
}

function getAllAgents() {
  const db = loadDB();
  return db.agents;
}

module.exports = { getAgent, setAgent, getAllAgents, loadDB, saveDB };
