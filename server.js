const https = require('https');
const http = require('http');

const PORT = process.env.PORT || 3000;
const STRIVEN_HOST = 'wsfsc.striven.com';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let targetPath = req.url;

    // Try all known Striven token endpoint variations
    if (targetPath === '/v1/accesstoken') targetPath = '/oauth/token';

    console.log('---> Request:', req.method, targetPath);
    console.log('---> Body:', body);
    console.log('---> Auth:', req.headers['authorization'] ? 'present' : 'missing');

    const forwardHeaders = {
      'host': STRIVEN_HOST,
      'content-type': 'application/x-www-form-urlencoded',
      'accept': 'application/json',
    };

    if (req.headers['authorization']) {
      forwardHeaders['authorization'] = req.headers['authorization'];
    }

    if (body) {
      forwardHeaders['content-length'] = Buffer.byteLength(body).toString();
    }

    const options = {
      hostname: STRIVEN_HOST,
      path: targetPath,
      method: req.method,
      headers: forwardHeaders,
    };

    const proxy = https.request(options, (proxyRes) => {
      let responseBody = '';
      proxyRes.on('data', chunk => responseBody += chunk);
      proxyRes.on('end', () => {
        console.log('<--- Status:', proxyRes.statusCode);
        console.log('<--- Response:', responseBody.substring(0, 500));
        res.writeHead(proxyRes.statusCode, {
          'content-type': proxyRes.headers['content-type'] || 'application/json',
        });
        res.end(responseBody);
      });
    });

    proxy.on('error', (err) => {
      console.log('!!! Error:', err.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: err.message }));
    });

    if (body) proxy.write(body);
    proxy.end();
  });
});

server.listen(PORT, () => {
  console.log('Striven proxy running on port ' + PORT);
});
