// Copyright 2018 The Outline Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as restify from 'restify';

// Headers a browser client is allowed to send to the management API.
const ALLOW_HEADERS = [
  'accept',
  'accept-version',
  'content-type',
  'request-id',
  'origin',
  'x-api-version',
  'x-request-id',
  'x-requested-with',
].join(',');

// Response headers a browser client is allowed to read.
const EXPOSE_HEADERS = [
  'api-version',
  'content-length',
  'content-md5',
  'content-type',
  'date',
  'request-id',
  'response-time',
].join(',');

const VARY_HEADER = 'origin,access-control-request-method,access-control-request-headers';

/**
 * CORS middleware for the management API.
 *
 * The server accepts requests from any origin without credentials. Any origin
 * that sends a request is echoed back, because `Access-Control-Allow-Origin: *`
 * cannot be combined with credentialed requests.
 *
 * This replaces the unmaintained `restify-cors-middleware2` package, which
 * pinned restify 11 and pulled in `spdy`, which no longer loads on Node.js 22+.
 */
export function createCorsMiddleware(): {
  preflight: restify.RequestHandler;
  actual: restify.RequestHandler;
} {
  const preflight: restify.RequestHandler = (req, res, next) => {
    if (req.method !== 'OPTIONS') {
      return next();
    }
    const origin = req.headers.origin as string | undefined;
    const requestedMethod = req.headers['access-control-request-method'] as string | undefined;
    if (!origin || !requestedMethod) {
      return next();
    }
    res.header('access-control-allow-origin', origin);
    res.header('access-control-allow-methods', `${requestedMethod},OPTIONS`);
    res.header('access-control-allow-headers', ALLOW_HEADERS);
    res.send(204);
  };

  const actual: restify.RequestHandler = (req, res, next) => {
    res.setHeader('vary', VARY_HEADER);
    const origin = req.headers.origin as string | undefined;
    if (!origin) {
      return next();
    }
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('access-control-expose-headers', EXPOSE_HEADERS);
    return next();
  };

  return {preflight, actual};
}
