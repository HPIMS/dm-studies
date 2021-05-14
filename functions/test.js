const querystring = require("querystring");
const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello World" }),
  };
};
