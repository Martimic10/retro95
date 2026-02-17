const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.cwd();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function safePathname(pathname) {
  const clean = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.resolve(ROOT, `.${clean}`);
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function createStripeCheckoutSession() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  if (!STRIPE_PRICE_ID) {
    throw new Error('Missing STRIPE_PRICE_ID');
  }

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${APP_BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${APP_BASE_URL}/cancel.html`);
  form.set('line_items[0][price]', STRIPE_PRICE_ID);
  form.set('line_items[0][quantity]', '1');
  form.set('allow_promotion_codes', 'true');

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString()
  });

  const json = await response.json();
  if (!response.ok) {
    const msg = json && json.error && json.error.message ? json.error.message : 'Stripe session creation failed';
    throw new Error(msg);
  }

  if (!json.url) {
    throw new Error('Stripe response missing checkout URL');
  }

  return json.url;
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'POST' && requestUrl.pathname === '/api/create-checkout-session') {
      await readBody(req);
      try {
        const url = await createStripeCheckoutSession();
        return sendJson(res, 200, { url });
      } catch (error) {
        return sendJson(res, 500, { error: String(error.message || error) });
      }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendText(res, 405, 'Method Not Allowed');
    }

    const filePath = safePathname(requestUrl.pathname);
    if (!filePath) {
      return sendText(res, 400, 'Bad Request');
    }

    fs.stat(filePath, (statErr, stats) => {
      if (statErr || !stats.isFile()) {
        return sendText(res, 404, 'Not Found');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (_error) {
    sendText(res, 500, 'Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Retro95 server running at http://localhost:${PORT}`);
});
