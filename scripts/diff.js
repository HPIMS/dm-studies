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

const surveyLibrary = new Set();

const diffs = new Map();
diffs.set("studies", new Set());
diffs.set("surveys", new Set());

async function getFile(path) {
  const data = await fs.promises.readFile(path, { encoding: "utf-8" });
  return {
    data: YAML.parse(data),
    hash: crypto.createHash("md5").update(data).digest("hex"),
  };
}

async function processSurveys() {
  log.info("*****************************************");
  log.info("****         Diffing Surveys         ****");
  log.info("*****************************************");

  const dir = path.join(__dirname, "../cfg/surveys");
  const seen = new Set();

  const surveyGroups = await fs.promises.readdir(dir);

  const promises = surveyGroups.map(async (surveyGroup) => {
    const groupDir = `${dir}/${surveyGroup}`;
    const surveys = await fs.promises.readdir(groupDir);

    let surveyPrefix = "";
    if (surveyGroup !== "library" && surveyGroup !== "legacy") {
      surveyPrefix = surveyGroup;
    }

    const surveyPromises = surveys.map(async (file) => {
      const rootName = file.replace(/\.yaml$|\.yml$/, "");
      const name = `${surveyPrefix ? `${surveyPrefix}::` : ""}${rootName}`;

      const { data, hash: nextHash } = await getFile(`${groupDir}/${file}`);
      const [lastHash, lastVersion] = versions.active?.surveys[name] ||
        versions.inactive?.surveys[name] || [null, null];
      let nextVersion = lastVersion;

      log.info(`[${name}] Processing`);

      // skip if inactive
      if (!data.active) {
        log.warning(`[${name}] Inactive.`);
        // Write out as inactive. If it's new and inactive, create a new record.
        // If it's changed an inactive, we don't care. The changes will be picked
        // up when/if it's moved to active again.
        nextVersions.inactive.surveys[name] = [
          lastHash || nextHash,
          lastVersion || 1,
        ];
        return;
      }

      log.info(`[${name}] Active. Continuing.`);

      if (rootName !== data.key) {
        log.error(`[${name}] Survey key and Filename mismatch`);
        return;
      }

      if (seen.has(name)) {
        // since we allow .yaml and .yml, it's possible that a file could be duplicated
        log.error(
          `[${name}] Duplicate key. ${name} has already been processed.`
        );
        return;
      }

      // add this survey to the survey library
      surveyLibrary.add(name);

      if (!lastHash || !lastVersion) {
        nextVersion = 1;
        // If this is the first time seeing this file set the version to the
        // existing version in the yaml, or 1.
        log.info(`[${name}] New Survey. Setting version to 1.`);
        diffs.get("surveys").add(name);
      } else if (lastHash !== nextHash) {
        nextVersion = lastVersion + 1;
        // If we've seen this file, but it has changed, increment the version
        log.info(
          `[${name}] Survey modified. Bumping version to ${nextVersion}.`
        );
        diffs.get("surveys").add(name);
      }
      log.important(`[${name}] Finished processing. Writing to version.lock.`);
      // write to the versions file
      nextVersions.active.surveys[name] = [nextHash, nextVersion];
    });

    return Promise.all(surveyPromises);
  });
  return Promise.all(promises);
}

async function processStudies() {
  log.info("*****************************************");
  log.info("****         Diffing Studies         ****");
  log.info("*****************************************");

  const dir = path.join(__dirname, "../cfg/studies");
  const seen = new Set();

  const files = await fs.promises.readdir(dir);

  const promises = files.map(async (file) => {
    const name = file.replace(/\.yaml$|\.yml$/, "");
    const { data, hash: nextHash } = await getFile(`${dir}/${file}`);
    const [lastHash, lastVersion] = versions.active?.studies[name] ||
      versions.inactive?.studies[name] || [null, null];
    let nextVersion = lastVersion;

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

    // warn if requested survey is not available
    data.surveys.forEach((s) => {
      if (!surveyLibrary.has(s) && !surveyLibrary.has(`${name}::${s}`)) {
        log.warning(
          `[${name}] Includes Survey "${s}" which does not exist in the survey library.`
        );
      }
    });

    seen.add(name);

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
        if (
          (surveyLibrary.has(`${name}::${s}`) &&
            diffs.get("surveys").has(`${name}::${s}`)) ||
          (!surveyLibrary.has(`${name}::${s}`) &&
            surveyLibrary.has(s) &&
            diffs.get("surveys").has(s))
        ) {
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

async function diff() {
  await processSurveys();
  await processStudies();
  // write out the new versions file
  await fs.promises.writeFile(
    "./version.lock",
    `${YAML.stringify(nextVersions)}\n`
  );
}
diff();
