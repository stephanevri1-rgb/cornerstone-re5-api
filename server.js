const http = require('http');
const fs = require('fs');
const path = require('path');

// Cornerstone RE5 API v2.0
// MongoDB Atlas (PERMANENT) + File fallback

let mongoose = null;
let Submission = null;
let dbConnected = false;
let useMongoDB = false;
const MONGODB_URI = process.env.MONGODB_URI;
const DATA_FILE = path.join('/tmp', 'submissions.json');

function loadFromFile() {
  try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { }
  return [];
}
function saveToFile(subs) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(subs, null, 2), 'utf8'); }
  catch (e) { }
}

async function initMongoDB() {
  if (!MONGODB_URI) { console.log('[DB] MONGODB_URI not set - using file storage'); return false; }
  try {
    mongoose = require('mongoose');
    const schema = new mongoose.Schema({
      id: { type: String, required: true, unique: true },
      date: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      idNumber: { type: String, required: true, index: true },
      passportNumber: { type: String, default: '' },
      contactNumber: { type: String, required: true },
      email: { type: String, required: true },
      examType: { type: String, required: true },
      score: { type: Number, required: true },
      correct: { type: Number, required: true },
      total: { type: Number, required: true },
      passed: { type: Boolean, required: true },
      timeTaken: { type: Number, required: true },
      answers: { type: mongoose.Schema.Types.Mixed, default: {} },
      topicBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    }, { timestamps: { createdAt: 'created_at', updatedAt: false } });
    schema.index({ idNumber: 1, date: -1 });
    schema.index({ created_at: -1 });
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 45000 });
    Submission = mongoose.model('Submission', schema);
    dbConnected = true; useMongoDB = true;
    const count = await Submission.countDocuments();
    console.log('[DB] MongoDB connected - ' + count + ' submissions');
    mongoose.connection.on('disconnected', () => { dbConnected = false; });
    mongoose.connection.on('reconnected', () => { dbConnected = true; console.log('[DB] Reconnected'); });
    return true;
  } catch (err) {
    console.error('[DB] MongoDB failed:', err.message);
    dbConnected = false; useMongoDB = false; mongoose = null; Submission = null;
    return false;
  }
}

async function getAllSubmissions() {
  if (useMongoDB && dbConnected) return await Submission.find().sort({ created_at: -1 }).lean();
  return loadFromFile();
}
async function saveSubmission(data) {
  if (useMongoDB && dbConnected) {
    await Submission.findOneAndUpdate({ id: data.id }, { $set: data }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return await Submission.countDocuments();
  }
  const subs = loadFromFile(); const idx = subs.findIndex(s => s.id === data.id);
  data.created_at = new Date().toISOString();
  if (idx >= 0) subs[idx] = data; else subs.unshift(data);
  saveToFile(subs); return subs.length;
}
async function deleteSubmission(id) {
  if (useMongoDB && dbConnected) { await Submission.deleteOne({ id: id }); return; }
  let subs = loadFromFile(); subs = subs.filter(s => s.id !== id); saveToFile(subs);
}
async function deleteLearnerSubmissions(idNumber) {
  if (useMongoDB && dbConnected) { const r = await Submission.deleteMany({ idNumber: idNumber }); return r.deletedCount; }
  let subs = loadFromFile(); const before = subs.length; subs = subs.filter(s => s.idNumber !== idNumber); saveToFile(subs); return before - subs.length;
}

async function startServer() {
  await initMongoDB();
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
    const url = req.url;
    if (url === '/' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', message: 'Cornerstone RE5 API v2.0', database: useMongoDB ? (dbConnected ? 'connected' : 'disconnected') : 'not-configured', storage: useMongoDB ? 'mongodb-atlas-permanent' : 'file-temp', version: '2.0.0' }));
      return;
    }
    if (url === '/api/submissions' && req.method === 'GET') {
      getAllSubmissions().then(docs => { res.writeHead(200); res.end(JSON.stringify(docs)); }).catch(err => { res.writeHead(500); res.end(JSON.stringify({ error: 'DB error' })); });
      return;
    }
    if (url === '/api/submissions' && req.method === 'POST') {
      let body = ''; req.on('data', chunk => body += chunk); req.on('end', async () => {
        try { const data = JSON.parse(body); const count = await saveSubmission(data); console.log('[SAVE] ' + data.firstName + ' ' + data.lastName + ' | ' + data.examType + ' | ' + data.score + '%'); res.writeHead(200); res.end(JSON.stringify({ success: true, count: count })); }
        catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })); }
      });
      return;
    }
    if (url.startsWith('/api/submissions/') && req.method === 'DELETE') {
      const parts = url.split('/'); const id = parts.pop();
      if (url.includes('/learner/')) {
        deleteLearnerSubmissions(id).then(deleted => { res.writeHead(200); res.end(JSON.stringify({ success: true, deleted: deleted })); }).catch(err => { res.writeHead(500); res.end(JSON.stringify({ error: 'DB error' })); });
      } else {
        deleteSubmission(id).then(() => { res.writeHead(200); res.end(JSON.stringify({ success: true })); }).catch(err => { res.writeHead(500); res.end(JSON.stringify({ error: 'DB error' })); });
      }
      return;
    }
    res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
  });
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => { console.log('Cornerstone RE5 API v2.0 on port ' + PORT + ' | Storage: ' + (useMongoDB ? 'MongoDB (PERMANENT)' : 'File (TEMPORARY)')); });
}

startServer();
