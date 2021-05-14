const querystring = require("querystring");
const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const fhirData = querystring.parse(event.body);
  const { questionnaire, item } = fhirData;

  if (!questionnaire) {
    return { statusCode: 400, body: "Missing Questionnaire" };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello World" }),
  };
};
