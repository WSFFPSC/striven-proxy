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
    if (targetPath === '/v1/accesstoken') targetPath = '/accesstoken';

    const forwardHeaders = {
      'host': STRIVEN_HOST,
      'content-type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
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
      res.writeHead(proxyRes.statusCode, {
        'content-type': proxyRes.headers['content-type'] || 'application/json',
      });
      proxyRes.pipe(res, { end: true });
    });

    proxy.on('error', (err) => {
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
