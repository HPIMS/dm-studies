const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const chalk = require("chalk");

const log = {
  error: (t) => console.log(chalk.red(t)),
  warning: (t) => console.log(chalk.yellow(t)),
  info: (t) => console.log(chalk.cyan(t)),
  important: (t) => console.log(chalk.green(t)),
};

const versions = YAML.parse(
  fs.readFileSync("./version.lock", { encoding: "utf-8" })
);

async function mkdir(path) {
  try {
    await fs.promises.stat(path);
  } catch (err) {
    await fs.promises.mkdir(path, { recursive: true });
  }
}

async function getFile(dir, group, file) {
  let rawBaseData = "";
  const rawData = await fs.promises.readFile(path.join(dir, group, file), {
    encoding: "utf-8",
  });

  const data = YAML.parse(rawData) || {};
  const { _extends } = data;

  if (_extends) {
    const extendsFile = `${_extends}.yaml`;
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
  return { ...(YAML.parse(rawBaseData) || {}), ...data };
}

const dftSurveyCfg = {};
const dftMultimediaCfg = {};
const dftInterventionCfg = {};

const defaultGraceDays = {
  ALWAYS: 0,
  ONCE: 0,
  DAILY: 0,
  WEEKLY: 1,
  BI_WEEKLY: 2,
  MONTHLY: 4,
};

async function processSurveys() {
  log.info("*****************************************");
  log.info("****        Building Surveys         ****");
  log.info("*****************************************");
  const index = [];

  const surveyDir = path.join(__dirname, "../cfg/surveys");
  const distDir = path.join(__dirname, "../dist/v3");

  const surveys = Object.keys(versions.active.surveys);

  const promises = surveys.map(async (surveyKey) => {
    let study;
    [, study, survey] = surveyKey.match(/^(.*?)::(.*)/) || [, null, surveyKey];
    let cfg;
    if (study) {
      cfg = await getFile(surveyDir, study, `${survey}.yaml`);
    } else {
      // this is a fallback for 'legacy' surveys
      cfg = await getFile(surveyDir, "legacy", `${survey}.yaml`);
    }

    const version = versions.active.surveys[surveyKey][1];

    log.info(`[${surveyKey}] Processing`);

    const { name, short, schedule, timeEstimate, ...data } = cfg;

    // Remove configs we don't need
    delete data.active;

    // set additional configs
    data.version = version;

    // add default grace days to the schedule for "PERIOD" schedules
    if (schedule.type === "PERIOD" && !schedule.graceDays) {
      schedule.graceDays = defaultGraceDays[schedule.period];
    }

    const surveyCfg = {
      version,
      schedule,
      timeEstimate,
      name,
      short,
      editable: data.editable,
    };
    dftSurveyCfg[surveyKey] = surveyCfg;

    log.info(`[${surveyKey}] Adding to survey index.`);
    index.push({ key: surveyKey, version, name, description: short });

    log.important(
      `[${surveyKey}] Finished processing. Writing ${surveyKey}.json`
    );
    await fs.promises.writeFile(
      `${distDir}/surveys/${surveyKey}.json`,
      JSON.stringify({ ...data, key: surveyKey })
    );
  });

  await Promise.all(promises);
  await fs.promises.writeFile(
    `${distDir}/surveys/index.json`,
    JSON.stringify(index)
  );
}

async function processMultimedia() {
  log.info("*****************************************");
  log.info("****      Building Multimedia        ****");
  log.info("*****************************************");
  const index = [];

  const multimediaDir = path.join(__dirname, "../cfg/multimedia");
  const distDir = path.join(__dirname, "../dist/v3");

  const multimedia = Object.keys(versions.active.multimedia);

  const promises = multimedia.map(async (multimediaKey) => {
    let study;
    [, study, media] = multimediaKey.match(/^(.*?)::(.*)/) || [
      ,
      null,
      multimediaKey,
    ];
    const cfg = await getFile(multimediaDir, study, `${media}.yaml`);
    const version = versions.active.multimedia[multimediaKey][1];

    log.info(`[${multimediaKey}] Processing`);

    const { name, short, schedule, timeEstimate, type, ...data } = cfg;

    // Remove configs we don't need
    delete data.active;

    // set additional configs
    data.version = version;

    // add default grace days to the schedule for "PERIOD" schedules
    if (schedule.type === "PERIOD" && !schedule.graceDays) {
      schedule.graceDays = defaultGraceDays[schedule.period];
    }

    const multimediaCfg = {
      version,
      type,
      schedule,
      timeEstimate,
      name,
      short,
      editable: data.editable,
    };
    dftMultimediaCfg[multimediaKey] = multimediaCfg;

    log.info(`[${multimediaKey}] Adding to multimedia index.`);
    index.push({ key: multimediaKey, type, version, name, description: short });

    log.important(
      `[${multimediaKey}] Finished processing. Writing ${multimediaKey}.json`
    );
    await fs.promises.writeFile(
      `${distDir}/multimedia/${multimediaKey}.json`,
      JSON.stringify({ ...data, key: multimediaKey })
    );
  });

  await Promise.all(promises);
  await fs.promises.writeFile(
    `${distDir}/multimedia/index.json`,
    JSON.stringify(index)
  );
}

async function processInterventions() {
  log.info("*****************************************");
  log.info("****    Building Interventions       ****");
  log.info("*****************************************");
  const index = [];

  const interventionsDir = path.join(__dirname, "../cfg/interventions");
  const distDir = path.join(__dirname, "../dist/v3");

  const interventions = Object.keys(versions.active.interventions);

  const promises = interventions.map(async (interventionKey) => {
    let study;
    [, study, intervention] = interventionKey.match(/^(.*?)::(.*)/) || [
      ,
      null,
      interventionKey,
    ];
    const cfg = await getFile(interventionsDir, study, `${intervention}.yaml`);
    const version = versions.active.interventions[interventionKey][1];

    log.info(`[${interventionKey}] Processing`);

    const { name, short, schedule, timeEstimate, type, ...data } = cfg;

    // Remove configs we don't need
    delete data.active;

    // set additional configs
    data.version = version;

    // add default grace days to the schedule for "PERIOD" schedules
    if (schedule.type === "PERIOD" && !schedule.graceDays) {
      schedule.graceDays = defaultGraceDays[schedule.period];
    }

    const interventionCfg = {
      version,
      type,
      schedule,
      timeEstimate,
      name,
      short,
      editable: data.editable,
    };
    dftInterventionCfg[interventionKey] = interventionCfg;

    log.info(`[${interventionKey}] Adding to interventions index.`);
    index.push({
      key: interventionKey,
      type,
      version,
      name,
      description: short,
    });

    log.important(
      `[${interventionKey}] Finished processing. Writing ${interventionKey}.json`
    );
    await fs.promises.writeFile(
      `${distDir}/interventions/${interventionKey}.json`,
      JSON.stringify({ ...data, key: interventionKey })
    );
  });

  await Promise.all(promises);
  await fs.promises.writeFile(
    `${distDir}/interventions/index.json`,
    JSON.stringify(index)
  );
}

async function processStudies() {
  log.info("*****************************************");
  log.info("****        Building Studies         ****");
  log.info("*****************************************");
  const index = [];

  const studyDir = path.join(__dirname, "../cfg/studies");
  const distDir = path.join(__dirname, "../dist/v3");

  const studies = Object.keys(versions.active.studies);

  const promises = studies.map(async (study) => {
    if (study === "baseline") {
      return;
    }
    const data = await getFile(studyDir, "", `${study}.yaml`);

    const {
      visibility,
      irb,
      studyTeamId,
      openEnrollment,
      shortDescription,
      eligibilityCriteria,
      timeResponsibility,
      imageId,
      animationId,
      videoId,
    } = data;

    const version = versions.active.studies[study][1];

    // Remove configs we don't need
    delete data.visibility;
    delete data.shortDescription;
    // set additional configs
    data.version = version;

    log.info(`[${study}] Processing`);

    log.info(`[${study}] Setting survey configs.`);
    // Pull in the real config object for the study's survey definitions
    const surveyTasks = [...(data.surveys || []), ...(data.baseline || [])].map(
      (survey) => {
        const reqSurveyKey = typeof survey === "string" ? survey : survey.key;

        let actualSurveyKey;
        if (versions.active.surveys[`${study}::${reqSurveyKey}`]) {
          actualSurveyKey = `${study}::${reqSurveyKey}`;
        } else if (versions.active.surveys[`library::${reqSurveyKey}`]) {
          actualSurveyKey = `library::${reqSurveyKey}`;
        } else if (versions.active.surveys[reqSurveyKey]) {
          actualSurveyKey = reqSurveyKey;
        } else {
          return undefined;
        }

        // If we've defined the survey in the study config as a string
        // it means we just want to take all defaults.
        if (typeof survey === "string") {
          return {
            key: actualSurveyKey,
            type: "survey",
            ...dftSurveyCfg[actualSurveyKey],
          };
        }
        // Otherwise, we'll override the default with our custom configs
        return {
          ...dftSurveyCfg[actualSurveyKey],
          ...survey,
          key: actualSurveyKey,
          type: "survey",
        };
      }
    );

    const multimediaTasks = (data.multimedia || []).map((multimedia) => {
      const reqMultimediaKey =
        typeof multimedia === "string" ? multimedia : multimedia.key;

      let actualMultimediaKey;
      if (versions.active.multimedia[`${study}::${reqMultimediaKey}`]) {
        actualMultimediaKey = `${study}::${reqMultimediaKey}`;
      } else if (versions.active.multimedia[`library::${reqMultimediaKey}`]) {
        actualMultimediaKey = `library::${reqMultimediaKey}`;
      } else {
        return undefined;
      }

      // If we've defined the survey in the study config as a string
      // it means we just want to take all defaults.
      if (typeof multimedia === "string") {
        return {
          key: actualMultimediaKey,
          ...dftMultimediaCfg[actualMultimediaKey],
        };
      }
      // Otherwise, we'll override the default with our custom configs
      return {
        ...dftMultimediaCfg[actualMultimediaKey],
        ...multimedia,
        key: actualMultimediaKey,
      };
    });

    const interventionTasks = (data.interventions || []).map((intervention) => {
      const reqInterventionKey =
        typeof intervention === "string" ? intervention : intervention.key;

      let actualInterventionKey;
      if (versions.active.interventions[`${study}::${reqInterventionKey}`]) {
        actualInterventionKey = `${study}::${reqInterventionKey}`;
      } else if (
        versions.active.interventions[`library::${reqInterventionKey}`]
      ) {
        actualInterventionKey = `library::${reqInterventionKey}`;
      } else {
        return undefined;
      }

      // If we've defined the survey in the study config as a string
      // it means we just want to take all defaults.
      if (typeof intervention === "string") {
        return {
          key: actualInterventionKey,
          ...dftInterventionCfg[actualInterventionKey],
          type: "intervention",
        };
      }
      // Otherwise, we'll override the default with our custom configs
      return {
        ...dftInterventionCfg[actualInterventionKey],
        ...intervention,
        key: actualInterventionKey,
        type: "intervention",
      };
    });

    delete data.baseline;
    delete data.surveys;
    delete data.multimedia;
    delete data.interventions;

    data.tasks = [
      ...surveyTasks,
      ...multimediaTasks,
      ...interventionTasks,
    ].filter((o) => o !== undefined);

    log.info(`[${study}] Adding to study index.`);
    index.push({
      studyKey: data.key,
      visibility,
      openEnrollment,
      shortDescription,
      eligibilityCriteria,
      timeResponsibility,
      imageId,
      animationId,
      videoId,
      version: version,
      name: data.name,
    });

    log.important(`[${study}] Finished processing. Writing ${study}.json`);
    await fs.promises.writeFile(
      `${distDir}/studies/${study}.json`,
      JSON.stringify(data)
    );
  });

  await Promise.all(promises);
  await fs.promises.writeFile(
    `${distDir}/studies/index.json`,
    JSON.stringify(index)
  );
}

async function build() {
  const distDir = path.join(__dirname, "../dist/v3");
  await Promise.all([
    mkdir(path.resolve(distDir, "..")),
    mkdir(distDir),
    mkdir(`${distDir}/studies`),
    mkdir(`${distDir}/surveys`),
    mkdir(`${distDir}/multimedia`),
    mkdir(`${distDir}/interventions`),
  ]);
  await processSurveys();
  await processMultimedia();
  await processInterventions();
  await processStudies();
  await fs.promises.writeFile(
    `${distDir}/versions.json`,
    JSON.stringify(versions)
  );
}
build();
