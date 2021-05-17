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

async function copyDirectory(srcDir, destDir) {
  const files = await fs.promises.readdir(srcDir);
  const promises = files.map(async (file) => {
    const src = `${srcDir}/${file}`;
    const dest = `${destDir}/${file}`;
    await fs.promises.copyFile(src, dest);
  });
  return Promise.all(promises);
}

const dftSurveyCfg = {};
const dftMultimediaCfg = {};

async function processSurveys() {
  log.info("*****************************************");
  log.info("****        Building Surveys         ****");
  log.info("*****************************************");
  const index = [];

  const surveyDir = path.join(__dirname, "../cfg/surveys");
  const distDir = path.join(__dirname, "../dist/v2");

  const surveys = Object.keys(versions.active.surveys);

  const promises = surveys.map(async (surveyKey) => {
    let study;
    [, study, survey] = surveyKey.match(/^(.*?)::(.*)/) || [, null, surveyKey];
    let cfg;
    if (study) {
      cfg = await fs.promises.readFile(`${surveyDir}/${study}/${survey}.yaml`, {
        encoding: "utf-8",
      });
    } else {
      // this is a fallback for 'legacy' surveys
      cfg = await fs.promises.readFile(`${surveyDir}/legacy/${survey}.yaml`, {
        encoding: "utf-8",
      });
    }

    const version = versions.active.surveys[surveyKey][1];

    log.info(`[${surveyKey}] Processing`);

    const { period, name, short, repeat, timeEstimate, ...data } =
      YAML.parse(cfg);

    // Remove configs we don't need
    delete data.active;

    // set additional configs
    data.version = version;

    const surveyCfg = {
      version,
      period,
      timeEstimate,
      name,
      short,
      repeat,
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
  const distDir = path.join(__dirname, "../dist/v2");

  const multimedia = Object.keys(versions.active.multimedia);

  const promises = multimedia.map(async (multimediaKey) => {
    let study;
    [, study, media] = multimediaKey.match(/^(.*?)::(.*)/) || [
      ,
      null,
      multimediaKey,
    ];
    const cfg = await fs.promises.readFile(
      `${multimediaDir}/${study}/${media}.yaml`,
      {
        encoding: "utf-8",
      }
    );

    const version = versions.active.multimedia[multimediaKey][1];

    log.info(`[${multimediaKey}] Processing`);

    const { period, name, short, timeEstimate, type, ...data } =
      YAML.parse(cfg);

    // Remove configs we don't need
    delete data.active;

    // set additional configs
    data.version = version;

    const multimediaCfg = {
      version,
      type,
      period,
      timeEstimate,
      name,
      short,
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

async function processStudies() {
  log.info("*****************************************");
  log.info("****        Building Studies         ****");
  log.info("*****************************************");
  const index = [];

  const studyDir = path.join(__dirname, "../cfg/studies");
  const distDir = path.join(__dirname, "../dist/v2");

  const studies = Object.keys(versions.active.studies);

  const promises = studies.map(async (study) => {
    let cfg = await fs.promises.readFile(`${studyDir}/${study}.yaml`, {
      encoding: "utf-8",
    });
    const data = YAML.parse(cfg);

    const version = versions.active.studies[study][1];

    // Remove configs we don't need
    delete data.active;

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

    const multimediaTasks =
      data.multimedia?.map((multimedia) => {
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
      }) || [];

    delete data.baseline;
    delete data.surveys;
    delete data.multimedia;

    data.tasks = [...surveyTasks, ...multimediaTasks].filter(
      (o) => o !== undefined
    );

    log.info(`[${study}] Adding to study index.`);
    index.push({
      key: data.key,
      version: version,
      name: data.name,
      description: data.description,
      consentId: data.consentId,
      wearables: data.wearables,
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
  const distDir = path.join(__dirname, "../dist/v2");
  await Promise.all([
    mkdir(path.resolve(distDir, "..")),
    mkdir(distDir),
    mkdir(`${distDir}/images`),
    mkdir(`${distDir}/studies`),
    mkdir(`${distDir}/surveys`),
    mkdir(`${distDir}/multimedia`),
  ]);
  await processSurveys();
  await processMultimedia();
  await processStudies();
  await copyDirectory(
    path.join(__dirname, "../cfg/images"),
    `${distDir}/images`
  );
  await fs.promises.writeFile(
    `${distDir}/versions.json`,
    JSON.stringify(versions)
  );
}
build();
