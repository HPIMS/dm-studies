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

    // in v3 videos and interventions are compiled into their own subdirectories.
    const taskType = task.sections[0].type || "survey";
    if (taskType === "video" || taskType === "intervention") {
      Object.assign(task, { ...task.sections[0] });
      delete task.type;
      delete task.sections;
    }

    const subdir =
      taskType === "survey"
        ? "surveys"
        : taskType === "video"
        ? "multimedia"
        : taskType === "intervention"
        ? "interventions"
        : "tasks";

    task.version = version;

    // Write the task JSON
    await fs.promises.writeFile(
      path.join(distDir, subdir, `${compositeKey}.json`),
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

    study.studyKey = studyKey;
    study.version = version;

    const tasks = [];
    // The study defines tasks by string key, or by an object with
    // a key that matches a task key and any overrides to the default
    // task schedule.
    const taskBuilders = study.tasks?.map((task) => async () => {
      const reqTaskKey = typeof task === "string" ? task : task.key;

      // Find the composite key for the referenced task. If the task
      // exists in the study specific directory use that one, otherwise
      // look for it in the library.
      let compositeTaskKey;
      if (versions.active.tasks[`${studyKey}::${reqTaskKey}`]) {
        compositeTaskKey = `${studyKey}::${reqTaskKey}`;
      } else if (versions.active.tasks[`library::${reqTaskKey}`]) {
        compositeTaskKey = `library::${reqTaskKey}`;
      }

      if (compositeTaskKey) {
        const [, groupKey, taskKey] = compositeTaskKey.match(/^(.*?)::(.*)/);
        const cfg = await getTaskFile(groupKey, `${taskKey}.yaml`);
        const [, version] = versions.active.tasks[compositeTaskKey];

        const taskType = cfg.sections?.[0] || "survey";

        // Pull out any configs for the task that we need at the study level.
        const taskRec = {
          key: compositeTaskKey,
          name: cfg.name,
          schedule: cfg.schedule,
          timeEstimate: cfg.timeEstimate,
          taskType,
          version,
        };
        // If we are using an object for the task definition, apply any overrides.
        if (typeof task !== "string") {
          Object.assign(taskRec, { ...task });
        }
        tasks.push(taskRec);
      }
    });

    await waterfall(taskBuilders);

    study.tasks = tasks;

    await fs.promises.writeFile(
      path.join(distDir, "studies", `${studyKey}.json`),
      JSON.stringify(study)
    );

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
  log.info("Building V3 ...");
  const distDir = path.join(__dirname, "../dist/v3");
  await mkdir(distDir);
  cleandir(distDir);
  await mkdir(path.join(distDir, "consents"));
  await mkdir(path.join(distDir, "studies"));
  await mkdir(path.join(distDir, "tasks"));
  await mkdir(path.join(distDir, "surveys"));
  await mkdir(path.join(distDir, "interventions"));
  await mkdir(path.join(distDir, "multimedia"));

  await processTasks(distDir);
  await processStudies(distDir);
})();
