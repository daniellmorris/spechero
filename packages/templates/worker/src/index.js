import * as handlers from './handlers/index.js';
import { initSpecHeroAmqp } from '@spechero/asyncapi';

// Initialize amqp
initSpecHeroAmqp({ 
    connectionSettings: {
        protocol: 'amqp', 
        host: 'localhost', 
        port: 5672, 
        username: 'guest', 
        password: 'guest'
    }, 
    operationHandlers: handlers
});
