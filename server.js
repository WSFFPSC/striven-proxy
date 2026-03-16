const https = require('https');
const http = require('http');

const PORT = process.env.PORT || 3000;
const STRIVEN_API = 'api.striven.com';

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
    // Strip leading /v1 from accesstoken path
    let targetPath = req.url;
    if (targetPath === '/v1/accesstoken') targetPath = '/accesstoken';

    const options = {
      hostname: STRIVEN_API,
      path: targetPath,
      method: req.method,
      headers: { ...req.headers, host: STRIVEN_API },
    };

    const proxy = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxy.on('error', (err) => {
      res.writeHead(502);
      res.end('Proxy error: ' + err.message);
    });

    if (body) proxy.write(body);
    proxy.end();
  });
});

server.listen(PORT, () => {
  console.log('Striven proxy running on port ' + PORT);
});
