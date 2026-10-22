import { createEndpoint } from '../lib/endpoint.js';
import { handleQuote } from '../lib/api.js';

export default createEndpoint(handleQuote);
