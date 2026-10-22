import { createEndpoint } from '../lib/endpoint.js';
import { handleCatalog } from '../lib/api.js';

export default createEndpoint(handleCatalog);
