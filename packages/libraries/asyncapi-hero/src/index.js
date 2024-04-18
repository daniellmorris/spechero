import { default as AmqpCacoonCjs } from 'amqp-cacoon';
import { Parser, fromFile } from '@asyncapi/parser';
import Ajv from 'ajv';

const parser = new Parser();
const AmqpCacoon = AmqpCacoonCjs.default;
const ajv = new Ajv({strict: false})
const ajvValidators = {};
const KEYS = {
    EXCHANGE_BINDING: 'x-hero-amqp-exchange-binding',
    QUEUE_BINDING: 'x-hero-amqp-queue-binding',
    HANDLER: 'x-hero-handler', // id / action
}

/**
 * Initializes AMQP connection and sets up queues, exchanges, and bindings based on the provided connection settings and AsyncAPI document.
 * Does this by
 * 1. Parsing the AsyncAPI document
 * 2. Iterating through each channel and extracting AMQP-specific bindings
 * 3. Creating a new AmqpCacoon instance with connection settings and event handlers
 * 4. Returning the initialized AmqpCacoon instance
 *
 * @param {Object} connectionSettings - The settings for the AMQP connection.
 * @param {string} connectionSettings.protocol - The protocol for the AMQP connection (e.g., "amqp" or "amqps").
 * @param {string} connectionSettings.username - The username for the AMQP connection.
 * @param {string} connectionSettings.password - The password for the AMQP connection.
 * @param {string} connectionSettings.host - The host for the AMQP connection.
 * @param {number} connectionSettings.port - The port for the AMQP connection.
 * @param {Object} connectionSettings.amqpOptions - Additional AMQP options for the connection.
 * @returns {Promise<void>} - A promise that resolves once the AMQP connection and setup are completed.
 */
export async function initSpecHeroAmqp({connectionSettings, operationHandlers, apiSpecFile}) {
  // Initialize empty objects to store queues, exchanges, and bindings
  const queues = {};
  const exchanges = {};
  const queueBindings = {};
  const exchangeBindings = {};
  const queueHandlers = {};

  // Parse the asyncapi.yaml file and extract all channels
  const api = await fromFile(parser, './asyncapi.yaml').parse();
  const channels = api.document.allChannels();
  const receiveOperations = api.document.allOperations().filterByReceive();

  for (const operation of receiveOperations) {
    const json = operation.json();
    if (json?.[KEYS.HANDLER]) {
      queueHandlers[operation.id()] = json;
    }
  }

  // Iterate through each channel and extract AMQP-specific bindings
  for (const channel of channels) {
    const json = channel.json();
    if (json?.bindings?.amqp) {
      const queue = json.bindings.amqp.queue;
      const exchange = json.bindings.amqp.exchange;
      const exchangeBinding = exchange?.[KEYS.EXCHANGE_BINDING];
      const queueBinding = queue?.[KEYS.QUEUE_BINDING];
      if (queue) {
        queues[queue.name] = queue;
      }
      if (exchange?.name) {
        exchanges[exchange.name] = exchange;
      }
      if (exchangeBinding) {
        exchangeBinding.destination = exchange.name;
        for (const routingKey of (exchangeBinding?.routingKeys || [])) {
          exchangeBindings[`${exchangeBinding.source}-${exchangeBinding.destination}-${routingKey}`] = exchangeBinding;
        }
      }
      if (queueBinding) {
        queueBinding.destination = queue.name;
        for (const routingKey of (queueBinding?.routingKeys || [])) {
          queueBindings[`${queueBinding.source}-${queueBinding.destination}-${routingKey}`] = queueBinding;
        }
      }
    }
  }

  // Create a new AmqpCacoon instance with connection settings and event handlers
  const amqpCacoon = new AmqpCacoon({
      protocol: connectionSettings?.protocol,
      username: connectionSettings?.username,
      password: connectionSettings?.password,
      host: connectionSettings?.host,
      port: connectionSettings?.port,
      amqp_opts: connectionSettings?.amqpOptions || {},
      providers: {
          logger: {
              debug: (...args) => {console.debug(...args)},
              error: (...args) => {console.error(...args)},
              fatal: (...args) => {console.error(...args)},
              info: (...args) => {console.info(...args)},
              trace: (...args) => {console.trace(...args)},
          }
      },
      // Event handler for successful connection to the broker
      onBrokerConnect: (connection, url) => {
          console.debug(
              `Connected to broker: "${connectionSettings.host}" on port ${connectionSettings.port} over "${connectionSettings.protocol}".`
          );
      },
      // Event handler for broker disconnection
      onBrokerDisconnect: (err) => {
          console.error(`Broker disconnected with error`, err);
      },
      // Event handler to ensure queues exist in RabbitMQ
      onChannelConnect: async (channel) => {
          const proms = [];
          try {
              // Ensure all exchanges are asserted
              for (const exchange of Object.values(exchanges)) {
                  proms.push(
                      channel.assertExchange(exchange.name, exchange.type, {
                          autoDelete: exchange.autoDelete || false,
                          durable: exchange.durable || true, 
                      })
                  );
              }
              // Ensure all queues are asserted
              for (const queue of Object.values(queues)) {
                  proms.push(
                      channel.assertQueue(queue.name, {
                          autoDelete: queue.autoDelete || false,
                          durable: queue.durable || true,
                          exclusive: queue.exclusive || false,
                      })
                  );
              }
              // Bind the queues to exchanges
              for (const binding of Object.values(queueBindings)) {
                  for (const routingKey of binding?.routingKeys || []) {
                      proms.push(
                          channel.bindQueue(
                              binding.destination, // queue
                              binding.source, // exchange
                              routingKey)
                      );
                  }
              }
              // Bind the queues to exchanges
              for (const binding of Object.values(exchangeBindings)) {
                  for (const routingKey of binding?.routingKeys || []) {
                      proms.push(
                          channel.bindExchange(
                              binding.destination, 
                              binding.source, 
                              routingKey)
                      );
                  }
              }
          } catch (err) {
              console.log(err);
              throw err;
          }
          return Promise.all(proms);
      },
  });

  // Ensure the publish channel is ready
  await amqpCacoon.getConsumerChannel();
 
  // Iteration over queueHandlers to create queue consumers
  for (const queueHandler of Object.values(queueHandlers)) {
    const queue = queueHandler?.channel?.bindings?.amqp?.queue?.name;
    const handlerConfig = queueHandler?.[KEYS.HANDLER];
    const operationHandler = handlerConfig?.id;
    const operationId = handlerConfig?.action;
    const handler = operationHandlers[operationHandler]?.default;
    if (handler?.[operationId] === undefined) {
      throw new Error(
          `Could not find a [${operationId}] function in ${operationHandler}.js when trying to route [${queueHandler?.channel?.bindings?.amqp?.is} ${queueHandler?.channel?.bindings?.amqp?.queue?.name}].`,
      );
    }
    await amqpCacoon.registerConsumer(queue, (channel/*: ChannelWrapper*/, msg/*: ConsumeMessage*/) => {
      let messageName;

      let messageContent = msg.content.toString();
      try {
        messageContent = JSON.parse(messageContent);
      } catch (err) {

      }

      let messageIsValid = false;
      for (const messageSchema of (queueHandler?.messages || [])) {
        let isValid = true;
        messageName = messageSchema.name || messageSchema['x-parser-message-name'] || 'unknown';
        
        if (messageSchema.payload) {
          const validator = ajvValidators[`${messageName}.payload`] || ajv.compile(messageSchema.payload);
          isValid = validator(messageContent);
        }

        if (isValid && messageSchema.header) {
          const validator = ajvValidators[`${messageName}.headers`] || ajv.compile(messageSchema.headers);
          isValid = validator(msg.properties.headers);
        }

        if (isValid) {
          messageIsValid = true;
          break;
        }
      }

      handler[operationId]({ 
        messageIsValid, 
        messageName: messageIsValid ? messageName : undefined, 
        channel, 
        message: { fields: msg.fields, headers: msg.properties.headers, payload: messageContent },
        asyncApiChannelDefinition: queueHandler,
        ack: () => { channel.ack(msg); },
        nack: (shouldRequeue = false) => { channel.nack(msg, false, shouldRequeue); },
      });
    });
  }
  

  // Return the initialized AmqpCacoon instance
  return amqpCacoon;
}
