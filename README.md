# Spec Hero

## Features

- **Monorepo Management with Lerna**
- **Docker Compose Integration**
- **PNPM for Package Management**
- **AsyncAPI and OpenAPI Documentation**
- **Custom X-Hero-XXX Tags**
- **AMQP Queue and Exchange Bindings**
- **Schema-Validated Request Handling**

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/daniellmorris/spechero.git
   ```

1. Start the services using Docker Compose:
   ```bash
   docker-compose up -d
   ```

## Documentation

### How It Works
The server setup reads the API documentation files (OpenAPI and AsyncAPI specifications).
For each endpoint, the server uses the x-hero-handler information to dynamically route requests to the appropriate handler and function based on the id and action specified.
This decouples the routing logic from the application code, allowing for cleaner and more maintainable codebase.
Adding More Handlers
To add more handlers for your endpoints:

### Special Fields and Handlers
Spec Hero introduces custom x-hero-* tags within its AsyncAPI and OpenAPI documentation to define and link API endpoints to their corresponding handlers in the codebase. This approach not only enhances the clarity of the service's API documentation but also streamlines the process of request handling by directly associating endpoints with their respective logic.

### Understanding x-hero-handler
The x-hero-handler tag is a custom extension used within Spec Hero to specify the handler associated with a particular API endpoint. This tag makes it straightforward to navigate from the API documentation to the actual implementation logic.

Example Usage
In the API documentation, a path defined for a ping endpoint might look like this:

```yaml
paths:
  # Ping endpoint
  /ping:
    get:
      summary: Ping endpoint
      x-hero-handler: 
        id: ping
        action: pong
      responses:
        '200':
          description: Success
```
**id**: Specifies the identifier for the handler. This is typically the name of the file without the extension.
**action**: Specifies the function within the handler to be invoked.

Implementing a Handler
Following the above example, the handler for the /ping endpoint is defined in ping.js. Here's how it's implemented:

```javascript
// File: ping.js
export default {
  pong: (req, res) => {
    console.log('ping', req);
    res.status(200).json({message: 'pong'});
  },
};
```

In this case, pong is the action specified in the x-hero-handler. When the /ping endpoint is hit with a GET request, the pong function is invoked, logging the request and returning a JSON response with the message 'pong'.

### AsyncAPI Message Handling with x-hero-handler

In addition to HTTP API documentation through OpenAPI, Spec Hero leverages AsyncAPI for comprehensive message bus documentation. To bridge the gap between documentation and implementation, we introduce the x-hero-handler tag within our AsyncAPI documents. This custom field is crucial for defining the linkage between message operations (like subscribing to a queue) and the corresponding message handlers in our codebase.

#### The x-hero-handler Tag in AsyncAPI

Within the context of AsyncAPI, the x-hero-handler tag is used to specify which handler should process messages for a given operation. This allows for clear, maintainable, and easily navigable connections between message definitions in the documentation and their processing logic.

Example: Queue Subscription Handling
Consider an operation defined for subscribing to messages from queueA. The x-hero-handler tag specifies how these messages should be processed:

```yaml
operations:
  queueA.subscribe:
    action: receive
    x-hero-handler:
      id: queueA
      action: log
    channel:
      $ref: '#/channels/queueA'
    messages:
      - $ref: '#/channels/queueA/messages/subscribe.message.0'
      - $ref: '#/channels/queueA/messages/subscribe.message.1'
```

This documentation snippet indicates that messages from queueA should be handled by the log action within the queueA handler.

#### Handler Implementation: queueA.js

The corresponding handler in queueA.js is structured to receive and process messages based on the documentation. The log method is called with all necessary message details, including validation status and message content:

```javascript
export default {
  log: ({messageIsValid, messageName, message, asyncApiChannelDefinition, ack, nack}) => {
    try {
      console.log('log', JSON.stringify({messageIsValid, messageName, message /* , asyncApiChannelDefinition */}, null, 2));
      ack();
    } catch (err) {
      console.log('Error logging message', err);
      // Logic for acknowledging or negatively acknowledging the message
      if (message.fields.redelivered) {
        console.log('Message has already been requeued, rejecting it');
        nack(false);
      } else {
        nack(true);
      }
    }
  },
};
```


## Queue and Exchange Setup in AsyncAPI Documents

Spec Hero supports the automatic setup and configuration of queues, exchanges, and their bindings, leveraging the capabilities of AsyncAPI documents to define the infrastructure requirements for AMQP messaging. This feature ensures that the message brokering environment is automatically prepared based on the specifications provided in the AsyncAPI documents, facilitating a seamless integration between service definitions and the messaging infrastructure.

### Leveraging Automatic Setup

By defining exchanges, queues, and their bindings within the AsyncAPI documents, Spec Hero can automatically configure the messaging infrastructure to match the specified architecture. This feature streamlines the process of setting up a complex messaging system and ensures consistency between the service documentation and the actual messaging setup.

### Exchange to Exchange Binding

The AsyncAPI document allows for the definition of exchanges and the bindings between them. This is particularly useful for scenarios where messages need to be routed through multiple exchanges before reaching their final destination. Here's an example of how to define an exchange-to-exchange binding:

```yaml
channels:
  myTopicExchangeEntry:
    address: myTopicExchangeEntry
    messages:
      publish.message:
        $ref: '#/components/messages/genericMessage'
    description: A topic exchange for routing messages
    bindings:
      amqp:
        is: routingKey
        exchange:
          name: myTopicExchangeEntry
          type: topic
          durable: true
          autoDelete: false
          vhost: /
        bindingVersion: "0.3.0"
  myTopicExchange:
    address: myTopicExchange
    messages:
      publish.message:
        $ref: '#/components/messages/genericMessage'
    description: A topic exchange for routing messages
    bindings:
      amqp:
        is: routingKey
        exchange:
          name: myTopicExchange
          type: topic
          durable: true
          autoDelete: false
          vhost: /
          x-hero-amqp-exchange-binding:
            source: myTopicExchangeEntry
            routingKeys:
            - #
            args: {}
        bindingVersion: "0.3.0"
```

This configuration specifies the creation of two topic exchanges (`myTopicExchangeEntry` and `myTopicExchange`) and binds `myTopicExchange` to `myTopicExchangeEntry` using a routing key.

### Queue to Exchange Bindings

Similarly, queues can be bound to exchanges directly within the AsyncAPI document, specifying how messages should be routed to queues based on routing keys. Here's an example setup for a queue bound to an exchange:

```yaml
channel:
  queueA:
    address: queueA
    messages:
      subscribe.message.0:
        $ref: '#/components/messages/genericMessage'
      subscribe.message.1:
        $ref: '#/components/messages/genericMessage2'
    description: Queue A bound to myTopicExchange with routingKeyA
    bindings:
      amqp:
        is: queue
        queue:
          name: queueA
          durable: true
          exclusive: false
          autoDelete: false
          vhost: /
          x-hero-amqp-queue-binding:
            source: myTopicExchange
            routingKeys:
            - routingKeyA
            args: {}
        bindingVersion: "0.3.0"
```

This setup ensures that `queueA` is automatically created and bound to `myTopicExchange` with `routingKeyA`, allowing messages that match the routing key to be routed to `queueA`.

## Contributing

We welcome contributions to Spec Hero! Please read our CONTRIBUTING.md file for guidelines on how to contribute.

## License

Spec Hero is open-source software licensed under the [MIT license](LICENSE).
