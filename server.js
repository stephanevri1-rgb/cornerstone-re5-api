const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

// Initialize database file if it doesn't exist
function initDB() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ submissions: [] }, null, 2));
  }
}

function readDB() {
  initDB();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Cornerstone RE5 Exam API' });
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
  db.submissions.push(submission);
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
