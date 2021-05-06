const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const YAML = require("yaml");
const chalk = require("chalk");

const log = {
  error: (t) => console.log(chalk.red(t)),
  warning: (t) => console.log(chalk.yellow(t)),
  info: (t) => console.log(chalk.cyan(t)),
  important: (t) => console.log(chalk.green(t)),
};

const validateSchema = require("./validate_schema");

const versions = YAML.parse(
  fs.readFileSync("./version.lock", { encoding: "utf-8" })
);

const nextVersions = {
  active: {
    studies: {},
    surveys: {},
  },
  inactive: {
    studies: {},
    surveys: {},
  },
};

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

async function processSurveys() {
  //
}

async function processStudies() {
  const dir = path.join(__dirname, "../cfg/studies");
  const seen = new Set();

  const files = await fs.promises.readdir(dir);

  const promises = files.map(async (file) => {
    const name = file.replace(/\.yaml$|\.yml$/, "");
    const { data, hash: nextHash } = await getFile(`${dir}/${file}`);
    const [lastHash, lastVersion] = versions.active?.studies[name] ||
      versions.inactive?.studies[name] || [null, null];

    log.info(`[${name}] Processing`);

    // skip if inactive
    if (!data.active) {
      log.warning(`[${name}] Inactive.`);
      // Write out as inactive. If it's new and inactive, create a new record.
      // If it's changed an inactive, we don't care. The changes will be picked
      // up when/if it's moved to active again.
      nextVersions.inactive.studies[name] = [
        lastHash || nextHash,
        lastVersion || 1,
      ];
      return;
    }

    log.info(`[${name}] Active. Continuing.`);

    if (name !== data.key) {
      log.error(`[${name}] Study key and Filename mismatch`);
      return;
    }

    if (seen.has(name)) {
      // since we allow .yaml and .yml, it's possible that a file could be duplicated
      log.error(`[${name}] Duplicate key. ${name} has already been processed.`);
      return;
    }

    const schemaErrors = validateSchema("study", data);
    if (schemaErrors.length) {
      log.error(`[${name}] Schema errors.`);
      log.error(schemaErrors);
      return;
    }

    seen.add(name);

    let nextVersion = lastVersion;
    if (!lastHash || !lastVersion) {
      nextVersion = 1;
      // If this is the first time seeing this file set the version to the
      // existing version in the yaml, or 1.
      log.info(`[${name}] New Study. Setting version to 1.`);
    } else if (lastHash !== nextHash) {
      nextVersion = lastVersion + 1;
      // If we've seen this file, but it has changed, increment the version
      log.info(`[${name}] Study modified. Bumping version to ${nextVersion}.`);
    } else {
      let surveyModified = false;
      // If it is a study, and we didn't change the file itself,
      // check to see if any of the study's surveys have changed.
      data.surveys.forEach((s) => {
        // make sure that the defined survey is available
        if (!surveyLibrary.has(s)) {
          log.warning(
            `[${name}] Includes Survey "${s}" which does not exist in the survey library.`
          );
          return;
        }

        // if a requested survey has changed we'll bump the version
        if (diffs.get("surveys").has(s)) {
          log.info(
            `[${name}] Contains modified survey ${s}. The study version will be bumped.`
          );
          surveyModified = true;
        }
      });

      if (surveyModified) {
        nextVersion = lastVersion + 1;
        // If we've seen this file, but it has changed, increment the version
        log.info(`[${name}] Study bumped to version ${nextVersion}.`);
      }
    }
    log.important(`[${name}] Finished processing. Writing to version.lock.`);

    // write to the versions file
    nextVersions.active.studies[name] = [nextHash, nextVersion];
  });
  return Promise.all(promises);
}

/*
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
    */

async function diff() {
  processStudies();
}

diff();
