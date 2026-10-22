// Vercel adapter: every endpoint is a thin wrapper over lib/api.js.

import { call } from '../lib/api.js';

export function createEndpoint(handler) {
  return async function endpoint(request, response) {
    let body = request.body;
    if (typeof body === 'string') {
      try {
        body = body ? JSON.parse(body) : {};
      } catch {
        body = {};
      }
    }

    const result = await call(handler, {
      method: request.method || 'GET',
      query: request.query || {},
      body: body || {}
    });

    if (typeof response.status === 'function') {
      response.status(result.status).json(result.body);
      return;
    }
    response.statusCode = result.status;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(result.body));
  };
}
