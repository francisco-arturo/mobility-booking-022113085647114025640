// Local development server. Not deployed: .vercelignore excludes this file.
//
//   node dev-server.mjs [--port 4319]
//
// Serves the static site with clean URLs and routes /api/* through the same handlers the
// serverless functions use, so the browser flow is identical locally and on Vercel.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { call, handleQuote, handleCatalog, handleBookings, handleContact } from './lib/api.js';

const root = process.cwd();
const portArgIndex = process.argv.indexOf('--port');
const port = Number(portArgIndex > -1 ? process.argv[portArgIndex + 1] : process.env.PORT || 4319);

const API = {
  '/api/quote': handleQuote,
  '/api/catalog': handleCatalog,
  '/api/bookings': handleBookings,
  '/api/contact': handleContact
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function send(response, status, body, type = 'text/html; charset=utf-8') {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  response.end(body);
}

function json(response, status, payload) {
  send(response, status, JSON.stringify(payload), 'application/json; charset=utf-8');
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalised = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return path.join(root, normalised);
}

async function serveStatic(request, response, urlPath) {
  let filePath = safePath(urlPath);
  if (urlPath === '/' || urlPath === '') filePath = path.join(root, 'index.html');
  if (!path.extname(filePath)) filePath = `${filePath}.html`;
  if (!existsSync(filePath)) {
    const notFound = path.join(root, '404.html');
    if (existsSync(notFound)) {
      send(response, 404, await readFile(notFound, 'utf8'));
    } else {
      send(response, 404, 'Not found', 'text/plain; charset=utf-8');
    }
    return;
  }
  const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  send(response, 200, await readFile(filePath), type);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  const handler = API[pathname];
  if (handler) {
    const body = request.method === 'GET' || request.method === 'HEAD' ? {} : await readBody(request);
    const result = await call(handler, {
      method: request.method,
      query: Object.fromEntries(url.searchParams.entries()),
      body
    });
    json(response, result.status, result.body);
    return;
  }

  if (pathname.startsWith('/api/')) {
    json(response, 404, { error: { code: 'not_found', message: 'Unknown API endpoint.' } });
    return;
  }

  try {
    await serveStatic(request, response, pathname);
  } catch (error) {
    console.error('[dev-server]', error);
    send(response, 500, 'Server error', 'text/plain; charset=utf-8');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Northlane running at http://127.0.0.1:${port}`);
  console.log(`Booking flow: http://127.0.0.1:${port}/booking`);
  console.log(`Operations:   http://127.0.0.1:${port}/ops`);
});
