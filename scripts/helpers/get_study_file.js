const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

async function getStudyFile(file) {
  const dir = path.join(__dirname, "../../cfg/studies");
  const rawData = await fs.promises.readFile(path.join(dir, file), {
    encoding: "utf-8",
  });
  return YAML.parse(rawData) || {};
}

module.exports = getStudyFile;
