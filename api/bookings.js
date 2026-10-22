import { createEndpoint } from '../lib/endpoint.js';
import { handleBookings } from '../lib/api.js';

export default createEndpoint(handleBookings);
