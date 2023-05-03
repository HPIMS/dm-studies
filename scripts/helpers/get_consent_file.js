const fs = require("fs");
const path = require("path");

async function getStudyFile(file) {
  const dir = path.join(__dirname, "../../cfg/consents");
  const rawData = await fs.promises.readFile(path.join(dir, file), {
    encoding: "utf-8",
  });
  return JSON.parse(rawData) || {};
}

module.exports = getStudyFile;
