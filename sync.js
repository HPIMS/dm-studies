const fs = require("fs");
const crypto = require("crypto");

const versions = require("./versions.json");

const diffs = new Map();
diffs.set("studies", new Map());
diffs.set("surveys", new Map());

async function getFile(path) {
  const data = await fs.promises.readFile(path, { encoding: "utf-8" });
  return {
    data: JSON.parse(data),
    hash: crypto.createHash("md5").update(data).digest("hex"),
  };
}

async function diff(type) {
  const dir = `${__dirname}/${type}`;

  const files = await fs.promises.readdir(dir);
  const promises = files.map(async (file) => {
    // ignore index files
    if (file === "index.json") {
      return;
    }

    const path = `${dir}/${file}`;
    const [name] = file.split(".json");
    const { data, hash: nextHash } = await getFile(path);

    // Do some minimal validation.
    if (name !== data.key) {
      throw new Error(`Key and Filename mismatch: ${type}/${file}`);
    }

    const [lastHash, lastVersion] = versions[type][name] || [null, null];
    if (!lastHash || !lastVersion) {
      // If this is the first time seeing this file set the version to the
      // existing version in the json, or 1.
      diffs.get(type).set(name, [nextHash, data.version || 1]);
    } else if (lastHash !== nextHash) {
      // If we've seen this file, but it has changed, increment the version
      diffs.get(type).set(name, [nextHash, lastVersion + 1]);
    }
  });

  return Promise.all(promises);
}

async function updateVersionFile() {
  const nextVersions = {
    ...versions,
    studies: {
      ...versions.studies,
      ...Object.fromEntries(diffs.get("studies")),
    },
    surveys: {
      ...versions.surveys,
      ...Object.fromEntries(diffs.get("surveys")),
    },
  };
  await fs.promises.writeFile(
    "./versions.json",
    `${JSON.stringify(nextVersions)}\n`
  );
}

async function sync() {
  await diff("surveys");
  await diff("studies");
  await updateVersionFile();
}
sync();
