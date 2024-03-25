export default {
  log: ({messageIsValid, messageName, message, asyncApiChannelDefinition, ack, nack}) => {
    try {
      console.log('log', JSON.stringify({messageIsValid, messageName, message/* , asyncApiChannelDefinition*/}, null, 2));
      ack();
    } catch (err) {
      console.log('Error logging message', err);
      // We will not requeue the message if it has already been requeued
      if (message.fields.redelivered) {
        console.log('Message has already been requeued, rejecting it');
        nack(false);
      } else {
        nack(true);
      }
    }
  },
};
