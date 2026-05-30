const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Use /tmp for database file (Render free tier requirement)
const DATA_FILE = path.join('/tmp', 'database.json');

app.use(cors());
app.use(express.json());

// Initialize database file
function initDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ submissions: [] }, null, 2));
    }
  } catch (e) {
    console.error('DB init error:', e.message);
  }
}

function readDB() {
  try {
    initDB();
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('DB read error:', e.message);
    return { submissions: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('DB write error:', e.message);
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Cornerstone RE5 Exam API', timestamp: new Date().toISOString() });
});

// Get all submissions
app.get('/api/submissions', (req, res) => {
  const db = readDB();
  res.json(db.submissions);
});

// Save a submission
app.post('/api/submissions', (req, res) => {
  const db = readDB();
  const submission = {
    ...req.body,
    created_at: new Date().toISOString(),
  };
  db.submissions.unshift(submission);
  writeDB(db);
  res.json({ success: true, id: submission.id });
});

// Delete a submission
app.delete('/api/submissions/:id', (req, res) => {
  const db = readDB();
  db.submissions = db.submissions.filter(s => s.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// Delete all submissions for a learner
app.delete('/api/submissions/learner/:idNumber', (req, res) => {
  const db = readDB();
  db.submissions = db.submissions.filter(s => s.idNumber !== req.params.idNumber);
  writeDB(db);
  res.json({ success: true });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database file: ${DATA_FILE}`);
  initDB();
}); 
