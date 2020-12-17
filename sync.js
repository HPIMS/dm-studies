const fs = require("fs");
const crypto = require("crypto");
const YAML = require("yaml");

const { validateSurveySchema, validateStudySchema } = require("./schema");

const versions = YAML.parse(
  fs.readFileSync("./version.lock", { encoding: "utf-8" })
);

const diffs = new Map();
diffs.set("studies", new Map());
diffs.set("surveys", new Map());

async function getFile(path) {
  const data = await fs.promises.readFile(path, { encoding: "utf-8" });
  return {
    data: YAML.parse(data),
    hash: crypto.createHash("md5").update(data).digest("hex"),
  };
}

async function diff(type) {
  const dir = `${__dirname}/${type}`;
  const seen = new Set();

  const files = await fs.promises.readdir(dir);
  const promises = files.map(async (file) => {
    const path = `${dir}/${file}`;
    const [name] = file.split(".yaml");
    const { data, hash: nextHash } = await getFile(path);

    // Do some validation.
    if (name !== data.key) {
      throw new Error(`Key and Filename mismatch: ${type}/${file}`);
    }
    if (seen.has(name)) {
      throw new Error(`Dupicate key: ${name}`);
    }

    if (type === "surveys") {
      validateSurveySchema(data);
    } else {
      validateStudySchema(data);
    }

    seen.add(name);

    const [lastHash, lastVersion] = versions[type][name] || [null, null];
    if (!lastHash || !lastVersion) {
      // If this is the first time seeing this file set the version to the
      // existing version in the yaml, or 1.
      diffs.get(type).set(name, [nextHash, data.version || 1]);
    } else if (lastHash !== nextHash) {
      // If we've seen this file, but it has changed, increment the version
      diffs.get(type).set(name, [nextHash, lastVersion + 1]);
    } else if (type === "studies") {
      // If it is a study, and we didn't change the file itself,
      // check to see if any of the study's surveys have changed.
      data.surveys.forEach((s) => {
        if (diffs.get("surveys").has(s)) {
          diffs.get(type).set(name, [nextHash, lastVersion + 1]);
        }
      });
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
    "./version.lock",
    `${YAML.stringify(nextVersions)}\n`
  );
}

async function sync() {
  await diff("surveys");
  await diff("studies");
  await updateVersionFile();
}
sync();
