const http = require('http');

let submissions = [];

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url;

  if (url === '/' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', message: 'Cornerstone RE5 API' }));
    return;
  }

  if (url === '/api/submissions' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify(submissions));
    return;
  }

  if (url === '/api/submissions' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        data.created_at = new Date().toISOString();
        submissions.unshift(data);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (url.startsWith('/api/submissions/') && req.method === 'DELETE') {
    const id = url.split('/').pop();
    if (url.includes('/learner/')) {
      submissions = submissions.filter(s => s.idNumber !== id);
    } else {
      submissions = submissions.filter(s => s.id !== id);
    }
    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
