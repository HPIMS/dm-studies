const fs = require("fs");
const crypto = require("crypto");
const YAML = require("yaml");

const validateSchema = require("./validate_schema");

const versions = YAML.parse(
  fs.readFileSync("./version.lock", { encoding: "utf-8" })
);

const surveyLibrary = new Set();

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
      throw new Error(`Key and Filename mismatch: "${type}/${file}"`);
    }
    if (seen.has(name)) {
      throw new Error(`Dupicate key: "${name}"`);
    }

    const schemaErrors = validateSchema(
      type === "surveys" ? "survey" : "study",
      data
    );
    if (schemaErrors.length) {
      console.error(schemaErrors);
      throw new Error(`Schema validation failed for "${name}"`);
    }

    seen.add(name);
    // if it's a survey add the key to the survey library so that we can check later
    // when processing the studies to see if their defined surveys actually exist.
    if (type === "surveys") {
      surveyLibrary.add(name);
    }

    const [lastHash, lastVersion] = versions[type][name] || [null, null];
    let nextVersion = lastVersion;

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
        // make sure that the defined survey is available
        if (!surveyLibrary.has(s)) {
          throw new Error(
            `Study: "${name}" includes Survey: "${s}" which does not exist in the survey library`
          );
        }
        //
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
