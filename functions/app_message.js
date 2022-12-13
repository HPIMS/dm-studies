const messageTypes = {
  error: "Error",
  warning: "Warning",
  notice: "Notice",
  none: "None",
};

/**
 * CONFIGURATION START
 */

// Set to true / false to display the app message.
const showMessage = true;

// Set a message type using the message types object.
const messageType = messageTypes.error;

// Set message text
const messageText =
  "ehive is currently experiencing outages. Please try again later.";

/**
 * CONFIGURATION END
 */

async function handler(event, context) {
  // Only allow GET
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      type: showMessage ? messageType : messageTypes.none,
      text: showMessage ? messageText : "",
    }),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store",
    },
  };
}

exports.handler = handler;
