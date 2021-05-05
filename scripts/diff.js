const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const YAML = require("yaml");

const validateSchema = require("./validate_schema");

const versions = YAML.parse(
  fs.readFileSync("./version.lock", { encoding: "utf-8" })
);

const log = console.log;

async function getFile(path) {
  const data = await fs.promises.readFile(path, { encoding: "utf-8" });
  return {
    data: YAML.parse(data),
    hash: crypto.createHash("md5").update(data).digest("hex"),
  };
}

async function processStudies() {
  const dir = path.join(__dirname, "../cfg/studies");

  const files = await fs.promises.readdir(dir);
  const promises = files.map(async (file) => {
    const name = file.replace(/\.yaml$|\.yml$/, "");
    const { data, hash: nextHash } = await getFile(`${dir}/${file}`);

    log(`[${name}] Processing`);

    // skip if inactive
    if (!data.active) {
      log(`[${name}] Inactive. Skipping...`);
    }

    // do basic validation
    if (name !== data.key) {
      log(`[${name}] Study key and Filename mismatch`);
    }
  });
  //
}

async function diff() {
  processStudies();
}

diff();
