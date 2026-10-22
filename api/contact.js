import { createEndpoint } from '../lib/endpoint.js';
import { handleContact } from '../lib/api.js';

export default createEndpoint(handleContact);
