const fs = require("fs/promises");
const crypto = require("crypto");

const versions = require("./versions.json");

const diffs = new Map();
diffs.set("studies", new Map());
diffs.set("surveys", new Map());

async function getFile(path) {
  const data = await fs.readFile(path, { encoding: "utf-8" });
  return {
    data: JSON.parse(data),
    hash: crypto.createHash("md5").update(data).digest("hex"),
  };
}

async function diff(type) {
  const dir = `${__dirname}/${type}`;

  const files = await fs.readdir(dir);

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
      const nextVersion = lastVersion + 1;
      // If we've seen this file, but it has changed, increment the version
      // and update the file.
      diffs.get(type).set(name, [nextHash, nextVersion]);
      data.version = nextVersion;
      await fs.writeFile(path, JSON.stringify(data, null, 2));
    }
  });

  return Promise.all(promises);
}

async function updateStudySurveys() {
  const dir = `${__dirname}/studies`;
  const files = await fs.readdir(dir);

  const promises = files.map(async (file) => {
    let updated = false;
    // Ignore the index file
    if (file === "index.json") {
      return;
    }
    const path = `${dir}/${file}`;
    // Update the version flags for the surveys
    // in the study's schedule
    const { data } = await getFile(path);
    data.surveys.forEach((survey) => {
      const { key } = survey;
      if (diffs.get("surveys").has(key)) {
        const [, version] = diffs.get("surveys").get(key);
        survey.version = version;
        updated = true;
      }
    });

    // Update the study file with the new survey version number.
    // We'll handle updating the study version flag in diff step.
    if (updated) {
      await fs.writeFile(path, JSON.stringify(data, null, 2));
    }
  });

  return Promise.all(promises);
}

async function syncVersionFile() {
  // TODO: handle deleted studies and surveys
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
  console.log("SYNC", nextVersions);
  await fs.writeFile("./versions.json", JSON.stringify(nextVersions));
}

// updateStudySurveys();
// diff("studies")

async function run() {
  await diff("surveys");
  console.log("here1");
  await updateStudySurveys();
  console.log("here2");
  await diff("studies");
  console.log("here3");

  await syncVersionFile();
  console.log("here4");
}
run();

/*
  files.forEach(async (file) => {
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
      const nextVersion = lastVersion + 1;
      // If we've seen this file, but it has changed, increment the version
      // and update the file.
      diffs.get(type).set(name, [nextHash, nextVersion]);
      data.version = nextVersion;
      await fs.writeFile(path, JSON.stringify(data, null, 2));
    }
  });
  */
