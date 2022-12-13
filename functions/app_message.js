const messageTypes = { error: "ERROR", warning: "WARNING", notice: "Notice" };

/**
 * CONFIGURATION START
 */

// Set to true / false to display the app message.
const showMessage = true;

// Set a message type using the message types object.
const messageType = messageTypes.error;

// Set message text
const messageText =
  "ehive is currently experiencing degraded service. Please try again later.";

/**
 * CONFIGURATION END
 */

async function handler(event, context) {
  return {
    statusCode: 200,
    body: showMessage
      ? JSON.stringify({
          messageType,
          messageText,
        })
      : "{}",
  };
}

exports.handler = handler;
