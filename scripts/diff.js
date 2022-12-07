const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const YAML = require("yaml");
const chalk = require("chalk");

// TODO: Use lowercase, dash no underscore
// TODO: Not schema validating surveys
// TODO: Add schema validation for multimedia

const log = {
  error: (t) => console.log(chalk.red(t)),
  warning: (t) => console.log(chalk.yellow(t)),
  info: (t) => console.log(chalk.cyan(t)),
  important: (t) => console.log(chalk.green(t)),
  plain: (t) => console.log(t),
};

const validateSchema = require("./validate_schema");

const versions = YAML.parse(
  fs.readFileSync("./version.lock", { encoding: "utf-8" })
);

const nextVersions = {
  active: {
    studies: {},
    surveys: {},
    multimedia: {},
    interventions: {},
  },
  inactive: {
    studies: {},
    surveys: {},
    multimedia: {},
    interventions: {},
  },
};

const surveyLibrary = new Set();
const multimediaLibrary = new Set();
const interventionLibrary = new Set();

const diffs = new Map();
diffs.set("studies", new Set());
diffs.set("surveys", new Set());
diffs.set("multimedia", new Set());
diffs.set("interventions", new Set());

async function getFile(dir, group, file) {
  let rawBaseData = "";
  const rawData = await fs.promises.readFile(path.join(dir, group, file), {
    encoding: "utf-8",
  });

  const data = YAML.parse(rawData) || {};
  const { _extends } = data;

  if (_extends) {
    const extendsFile = `${_extends}.yaml`;
    //console.log("HERE", YAML.parse("{}"));
    // Try the current group first. If that fails, try the library.
    try {
      rawBaseData = await fs.promises.readFile(
        path.join(dir, group, extendsFile),
        {
          encoding: "utf-8",
        }
      );
    } catch (err) {
      log.warning(
        `Could not find ${extendsFile} in ${group}. Checking library.`
      );
      try {
        rawBaseData = await fs.promises.readFile(
          path.join(dir, "library", extendsFile),
          {
            encoding: "utf-8",
          }
        );
      } catch (err) {
        log.error(`Could not find ${extendsFile} in library. Skipping.`);
      }
    }
  }

  const allData = { ...(YAML.parse(rawBaseData) || {}), ...data };
  return {
    data: allData,
    hash: crypto
      .createHash("md5")
      .update(JSON.stringify(allData))
      .digest("hex"),
  };
}

async function processSurveys() {
  log.plain("*****************************************");
  log.plain("****         Diffing Surveys         ****");
  log.plain("*****************************************");

  const dir = path.join(__dirname, "../cfg/surveys");
  const surveyGroups = await fs.promises.readdir(dir);

  const promises = surveyGroups.map(async (surveyGroup) => {
    const groupDir = `${dir}/${surveyGroup}`;
    const surveys = await fs.promises.readdir(groupDir);

    let surveyPrefix = surveyGroup;

    const surveyPromises = surveys.map(async (file) => {
      const rootName = file.replace(/\.yaml$|\.yml$/, "");
      const extension = file.split(".").pop();
      const name = `${surveyPrefix ? `${surveyPrefix}::` : ""}${rootName}`;

      const { data, hash: nextHash } = await getFile(dir, surveyGroup, file);
      const [lastHash, lastVersion] = versions.active.surveys[name] ||
        versions.inactive.surveys[name] || [null, null];
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

      if (rootName !== data.key) {
        log.error(`[${name}] Survey key and Filename mismatch.`);
        return;
      }

      // If we are using .yml, automatically move to .yaml.
      if (extension === "yml") {
        try {
          // see if the .yaml file that we want to move it to already exists
          await fs.promises.stat(`${groupDir}/${rootName}.yaml`);
          log.error(
            `[${name}] Uses a .yml extension and another file with a .yaml extension already exists. Could not automatically rename.`
          );
          return;
        } catch (err) {
          log.warning(`[${name}] Renaming to ${name}.yaml.`);
          // if we get here it means we can rename
          await fs.promises.rename(
            `${groupDir}/${rootName}.yml`,
            `${groupDir}/${rootName}.yaml`
          );
        }
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

async function processMultimedia() {
  log.plain("*****************************************");
  log.plain("****       Diffing Multimedia        ****");
  log.plain("*****************************************");

  const dir = path.join(__dirname, "../cfg/multimedia");
  const multimediaGroups = await fs.promises.readdir(dir);

  const promises = multimediaGroups.map(async (multimediaGroup) => {
    const groupDir = `${dir}/${multimediaGroup}`;
    const multimedia = await fs.promises.readdir(groupDir);
    const multimediaPrefix = multimediaGroup;

    const multimediaPromises = multimedia.map(async (file) => {
      const rootName = file.replace(/\.yaml$|\.yml$/, "");
      const extension = file.split(".").pop();
      const name = `${multimediaPrefix}::${rootName}`;

      const { data, hash: nextHash } = await getFile(
        dir,
        multimediaGroup,
        file
      );
      const [lastHash, lastVersion] = versions.active.multimedia[name] ||
        versions.inactive.multimedia[name] || [null, null];
      let nextVersion = lastVersion;

      log.info(`[${name}] Processing`);

      // skip if inactive
      if (!data.active) {
        log.warning(`[${name}] Inactive.`);
        // Write out as inactive. If it's new and inactive, create a new record.
        // If it's changed an inactive, we don't care. The changes will be picked
        // up when/if it's moved to active again.
        nextVersions.inactive.multimedia[name] = [
          lastHash || nextHash,
          lastVersion || 1,
        ];
        return;
      }

      if (rootName !== data.key) {
        log.error(`[${name}] Multimedia key and Filename mismatch.`);
        return;
      }

      // If we are using .yml, automatically move to .yaml.
      if (extension === "yml") {
        try {
          // see if the .yaml file that we want to move it to already exists
          await fs.promises.stat(`${groupDir}/${rootName}.yaml`);
          log.error(
            `[${name}] Uses a .yml extension and another file with a .yaml extension already exists. Could not automatically rename.`
          );
          return;
        } catch (err) {
          log.warning(`[${name}] Renaming to ${name}.yaml.`);
          // if we get here it means we can rename
          await fs.promises.rename(
            `${groupDir}/${rootName}.yml`,
            `${groupDir}/${rootName}.yaml`
          );
        }
      }

      // add this multimedia to the multimedia library
      multimediaLibrary.add(name);

      if (!lastHash || !lastVersion) {
        nextVersion = 1;
        // If this is the first time seeing this file set the version to the
        // existing version in the yaml, or 1.
        log.info(`[${name}] New Multimedia. Setting version to 1.`);
        diffs.get("multimedia").add(name);
      } else if (lastHash !== nextHash) {
        nextVersion = lastVersion + 1;
        // If we've seen this file, but it has changed, increment the version
        log.info(
          `[${name}] Multimedia modified. Bumping version to ${nextVersion}.`
        );
        diffs.get("multimedia").add(name);
      }
      log.important(`[${name}] Finished processing. Writing to version.lock.`);
      // write to the versions file
      nextVersions.active.multimedia[name] = [nextHash, nextVersion];
    });
    return Promise.all(multimediaPromises);
  });
  return Promise.all(promises);
}

async function processInterventions() {
  log.plain("*****************************************");
  log.plain("****     Diffing Interventions       ****");
  log.plain("*****************************************");

  const dir = path.join(__dirname, "../cfg/interventions");
  const interventionGroups = await fs.promises.readdir(dir);

  const promises = interventionGroups.map(async (interventionGroup) => {
    const groupDir = `${dir}/${interventionGroup}`;
    const interventions = await fs.promises.readdir(groupDir);
    const interventionPrefix = interventionGroup;

    const interventionPromises = interventions.map(async (file) => {
      const rootName = file.replace(/\.yaml$|\.yml$/, "");
      const extension = file.split(".").pop();
      const name = `${interventionPrefix}::${rootName}`;

      const { data, hash: nextHash } = await getFile(
        dir,
        interventionGroup,
        file
      );
      const [lastHash, lastVersion] = versions.active.interventions[name] ||
        versions.inactive.interventions[name] || [null, null];
      let nextVersion = lastVersion;

      log.info(`[${name}] Processing`);

      // skip if inactive
      if (!data.active) {
        log.warning(`[${name}] Inactive.`);
        // Write out as inactive. If it's new and inactive, create a new record.
        // If it's changed an inactive, we don't care. The changes will be picked
        // up when/if it's moved to active again.
        nextVersions.inactive.interventions[name] = [
          lastHash || nextHash,
          lastVersion || 1,
        ];
        return;
      }

      if (rootName !== data.key) {
        log.error(`[${name}] Intervention key and Filename mismatch.`);
        return;
      }

      // If we are using .yml, automatically move to .yaml.
      if (extension === "yml") {
        try {
          // see if the .yaml file that we want to move it to already exists
          await fs.promises.stat(`${groupDir}/${rootName}.yaml`);
          log.error(
            `[${name}] Uses a .yml extension and another file with a .yaml extension already exists. Could not automatically rename.`
          );
          return;
        } catch (err) {
          log.warning(`[${name}] Renaming to ${name}.yaml.`);
          // if we get here it means we can rename
          await fs.promises.rename(
            `${groupDir}/${rootName}.yml`,
            `${groupDir}/${rootName}.yaml`
          );
        }
      }

      // add this multimedia to the multimedia library
      interventionLibrary.add(name);

      if (!lastHash || !lastVersion) {
        nextVersion = 1;
        // If this is the first time seeing this file set the version to the
        // existing version in the yaml, or 1.
        log.info(`[${name}] New Intervention. Setting version to 1.`);
        diffs.get("interventions").add(name);
      } else if (lastHash !== nextHash) {
        nextVersion = lastVersion + 1;
        // If we've seen this file, but it has changed, increment the version
        log.info(
          `[${name}] Intervention modified. Bumping version to ${nextVersion}.`
        );
        diffs.get("interventions").add(name);
      }
      log.important(`[${name}] Finished processing. Writing to version.lock.`);
      // write to the versions file
      nextVersions.active.interventions[name] = [nextHash, nextVersion];
    });
    return Promise.all(interventionPromises);
  });
  return Promise.all(promises);
}

async function processStudies() {
  log.plain("*****************************************");
  log.plain("****         Diffing Studies         ****");
  log.plain("*****************************************");

  const dir = path.join(__dirname, "../cfg/studies");
  const files = await fs.promises.readdir(dir);

  const promises = files.map(async (file) => {
    const name = file.replace(/\.yaml$|\.yml$/, "");
    const extension = file.split(".").pop();
    const { data, hash: nextHash } = await getFile(dir, "", file);
    const [lastHash, lastVersion] = versions.active.studies[name] ||
      versions.inactive.studies[name] || [null, null];
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

    if (name !== data.key) {
      log.error(`[${name}] Study key and Filename mismatch.`);
      return;
    }

    if (name === "library") {
      log.error(`[${name}] Reserved study name.`);
      return;
    }

    // If we are using .yml, automatically move to .yaml.
    if (extension === "yml") {
      try {
        // see if the .yaml file that we want to move it to already exists
        await fs.promises.stat(`${dir}/${name}.yaml`);
        log.error(
          `[${name}] Uses a .yml extension and another file with a .yaml extension already exists. Could not automatically rename.`
        );
        return;
      } catch (err) {
        log.warning(`[${name}] Renaming to ${name}.yaml.`);
        // if we get here it means we can rename
        await fs.promises.rename(`${dir}/${name}.yml`, `${dir}/${name}.yaml`);
      }
    }

    // TODO: VALIDATE SCHEMA
    const schemaErrors = [];
    // const schemaErrors = validateSchema("study", data);
    if (schemaErrors.length) {
      log.error(`[${name}] Schema errors.`);
      log.error(JSON.stringify(schemaErrors));
      return;
    }

    // warn if requested survey is not available
    (data.surveys || []).forEach((s) => {
      const reqSurveyKey = typeof s === "string" ? s : s.key;
      if (
        !surveyLibrary.has(`${name}::${reqSurveyKey}`) &&
        !surveyLibrary.has(`library::${reqSurveyKey}`) &&
        !surveyLibrary.has(reqSurveyKey)
      ) {
        log.warning(
          `[${name}] Includes survey "${reqSurveyKey}" which does not exist in the survey library.`
        );
      }
    });

    // warn if requested multimedia is not available
    (data.multimedia || []).forEach((m) => {
      const reqMultimediaKey = typeof m === "string" ? m : m.key;
      if (
        !multimediaLibrary.has(`${name}::${reqMultimediaKey}`) &&
        !multimediaLibrary.has(`library::${reqMultimediaKey}`)
      ) {
        log.warning(
          `[${name}] Includes multimedia "${reqMultimediaKey}" which does not exist in the multimedia library.`
        );
      }
    });

    // warn if requested intervention is not available
    (data.interventions || []).forEach((i) => {
      const reqInterventionKey = typeof i === "string" ? i : i.key;
      if (
        !interventionLibrary.has(`${name}::${reqInterventionKey}`) &&
        !interventionLibrary.has(`library::${reqInterventionKey}`)
      ) {
        log.warning(
          `[${name}] Includes intervention "${reqInterventionKey}" which does not exist in the intervention library.`
        );
      }
    });

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
      (data.surveys || []).forEach((s) => {
        const sKey = s.key || s;
        if (
          // study specific
          (surveyLibrary.has(`${name}::${sKey}`) &&
            diffs.get("surveys").has(`${name}::${sKey}`)) ||
          (!surveyLibrary.has(`${name}::${sKey}`) &&
            // library
            surveyLibrary.has(`library::${sKey}`) &&
            diffs.get("surveys").has(`library::${sKey}`))
        ) {
          log.info(
            `[${name}] Contains modified survey ${sKey}. The study version will be bumped.`
          );
          surveyModified = true;
        }
      });

      let multimediaModified = false;
      // If it is a study, and we didn't change the file itself,
      // check to see if any of the study's multimedia tasks have changed.
      (data.multimedia || []).forEach((m) => {
        const mKey = m.key || m;
        if (
          (multimediaLibrary.has(`${name}::${mKey}`) &&
            diffs.get("multimedia").has(`${name}::${mKey}`)) ||
          (!multimediaLibrary.has(`${name}::${mKey}`) &&
            // library
            multimediaLibrary.has(`library::${mKey}`) &&
            diffs.get("multimedia").has(`library::${mKey}`))
        ) {
          log.info(
            `[${name}] Contains modified multimedia ${mKey}. The study version will be bumped.`
          );
          multimediaModified = true;
        }
      });

      let interventionModified = false;
      // If it is a study, and we didn't change the file itself,
      // check to see if any of the study's multimedia tasks have changed.
      (data.interventions || []).forEach((i) => {
        const iKey = i.key || i;
        if (
          (interventionLibrary.has(`${name}::${iKey}`) &&
            diffs.get("interventions").has(`${name}::${iKey}`)) ||
          (!interventionLibrary.has(`${name}::${iKey}`) &&
            // library
            interventionLibrary.has(`library::${iKey}`) &&
            diffs.get("interventions").has(`library::${iKey}`))
        ) {
          log.info(
            `[${name}] Contains modified interventions ${iKey}. The study version will be bumped.`
          );
          interventionModified = true;
        }
      });

      if (surveyModified || multimediaModified || interventionModified) {
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
  await processMultimedia();
  await processInterventions();
  await processStudies();
  // write out the new versions file
  await fs.promises.writeFile(
    "./version.lock",
    `${YAML.stringify(nextVersions, { sortMapEntries: true })}\n`
  );
}
diff();
