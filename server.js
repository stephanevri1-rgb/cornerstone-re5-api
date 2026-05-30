const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory database (works on Render free tier)
let memoryDB = { submissions: [] };

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Cornerstone RE5 Exam API' });
});

// Get all submissions
app.get('/api/submissions', (req, res) => {
  res.json(memoryDB.submissions);
});

// Save a submission
app.post('/api/submissions', (req, res) => {
  const submission = { ...req.body, created_at: new Date().toISOString() };
  memoryDB.submissions.unshift(submission);
  res.json({ success: true, id: submission.id });
});

// Delete a submission
app.delete('/api/submissions/:id', (req, res) => {
  memoryDB.submissions = memoryDB.submissions.filter(s => s.id !== req.params.id);
  res.json({ success: true });
});

// Delete all for a learner
app.delete('/api/submissions/learner/:idNumber', (req, res) => {
  memoryDB.submissions = memoryDB.submissions.filter(s => s.idNumber !== req.params.idNumber);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
