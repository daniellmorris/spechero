import * as handlers from './handlers/index.js';
import {initSpecHeroAmqp} from '@spechero/asyncapi';

console.log('AMQP Connection', {
  protocol: process.env.ASYNC_PROTOCOL || 'amqp',
  host: process.env.ASYNC_HOST || 'localhost',
  port: process.env.ASYNC_PORT ? parseInt(process.env.ASYNC_PORT) : 5672,
  username: process.env.ASYNC_USERNAME || 'guest',
});
// Initialize amqp
initSpecHeroAmqp({
  connectionSettings: {
    protocol: process.env.ASYNC_PROTOCOL || 'amqp',
    host: process.env.ASYNC_HOST || 'localhost',
    port: process.env.ASYNC_PORT ? parseInt(process.env.ASYNC_PORT) : 5672,
    username: process.env.ASYNC_USERNAME || 'guest',
    password: process.env.ASYNC_PASSWORD || 'guest',
  },
  operationHandlers: handlers,
});
