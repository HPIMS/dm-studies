// TODO: make sync instead of using waterfall everywhere.
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

const log = require("./helpers/log");
const cleandir = require("./helpers/cleandir");
const mkdir = require("./helpers/mkdir");
const waterfall = require("./helpers/waterfall");
const getConsentFile = require("./helpers/get_consent_file");
const getStudyFile = require("./helpers/get_study_file");
const getTaskFile = require("./helpers/get_task_file");

const versions = YAML.parse(
  fs.readFileSync(path.join(__dirname, "../version.lock"), {
    encoding: "utf-8",
  })
);

async function processTasks(distDir) {
  const tasks = Object.keys(versions.active.tasks);
  const index = [];

  const executors = tasks.map((compositeKey) => async () => {
    const [, groupKey, taskKey] = compositeKey.match(/^(.*?)::(.*)/);
    const [, version] = versions.active.tasks[compositeKey];
    const task = await getTaskFile(groupKey, `${taskKey}.yaml`);

    task.version = version;

    // Write the task JSON
    await fs.promises.writeFile(
      path.join(distDir, "tasks", `${compositeKey}.json`),
      JSON.stringify({ ...task, key: compositeKey })
    );

    // Build the task index record.
    const indexRec = {
      key: compositeKey,
      name: task.name,
      version,
    };
    index.push(indexRec);
  });

  await waterfall(executors);

  // Write the task index file
  await fs.promises.writeFile(
    path.join(distDir, "tasks", "index.json"),
    JSON.stringify(index)
  );
}

async function processStudies(distDir) {
  const studies = Object.keys(versions.active.studies);
  const index = [];

  const executors = studies.map((studyKey) => async () => {
    const [, version] = versions.active.studies[studyKey];
    const study = await getStudyFile(`${studyKey}.yaml`);

    study.version = version;

    // TODO: PROCESS TASK CONFIGURATIONS

    // Build the study index record.
    const indexRec = {
      studyKey,
      name: study.name,
      shortDescription: study.shortDescription,
      visibility: study.visibility,
      openEnrollment: study.openEnrollment,
      timeResponsibility: study.timeResponsibility,
      imageId: study.imageId,
      version: study.version,
    };
    if (study.animationId) indexRec.animationId = study.animationId;
    if (study.videoId) indexRec.videoId = study.videoId;

    index.push(indexRec);

    // Move the consent to dist
    const consent = await getConsentFile(`${studyKey}.json`);
    await fs.promises.writeFile(
      path.join(distDir, "consents", `${studyKey}.json`),
      JSON.stringify(consent)
    );
  });

  await waterfall(executors);

  // Write the study index file
  await fs.promises.writeFile(
    path.join(distDir, "studies", "index.json"),
    JSON.stringify(index)
  );
}

(async function build() {
  const distDir = path.join(__dirname, "../dist/v4");
  await mkdir(distDir);
  cleandir(distDir);
  await mkdir(path.join(distDir, "consents"));
  await mkdir(path.join(distDir, "studies"));
  await mkdir(path.join(distDir, "tasks"));

  await processTasks(distDir);
  await processStudies(distDir);
})();
