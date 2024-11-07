// TODO: make sync instead of using waterfall everywhere.
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const JSZip = require("jszip");

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

    const taskType = task.sections.reduce((typ, sec) => {
      if (!typ || sec.type === typ) {
        return sec.type;
      }
      return "composite";
    }, undefined);

    // Massage the task configuration to be more usable by the client.
    task.sections = task.sections.map((section) => {
      if (section.type !== "survey") return section;

      // We don't need to do anything special for the section types that
      // are NOT surveys, so only continue if we have a survey type here.
      const { key: sectionKey, questions = [], ...sectionRest } = section;
      return {
        key: sectionKey,
        ...sectionRest,
        questions: questions.map((question) => {
          const {
            key: questionKey,
            question: title,
            options,
            ...questionRest
          } = question;
          // We add the sectionKey and questionKey directly onto the
          // config for each question so that the questionnaire component
          // knows exactly which field it's dealing with.
          return {
            sectionKey,
            questionKey,
            title,
            ...questionRest,
            options:
              options &&
              options.map((option) => {
                const { value: key, text: label, ...optionRest } = option;
                return { key, label, ...optionRest };
              }),
          };
        }),
      };
    });

    // Write the task JSON
    await fs.promises.writeFile(
      path.join(distDir, "tasks", `${compositeKey}.json`),
      JSON.stringify({ ...task, key: compositeKey, type: taskType })
    );

    // Build the task index record.
    const indexRec = {
      key: compositeKey,
      type: taskType,
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

        const taskType = cfg.sections.reduce((typ, sec) => {
          if (!typ || sec.type === typ) {
            return sec.type;
          }
          return "composite";
        }, undefined);

        // Pull out any configs for the task that we need at the study level.
        const taskRec = {
          key: compositeTaskKey,
          type: taskType,
          name: cfg.name,
          schedule: cfg.schedule,
          timeEstimate: cfg.timeEstimate,
          version,
        };
        // If we are using an object for the task definition, apply any overrides.
        if (typeof task !== "string") {
          Object.assign(taskRec, { ...task, key: compositeTaskKey });
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
      minVersion: study.minVersion,
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
  const distDir = path.join(__dirname, "../dist/study-configuration");

  await mkdir(distDir);
  cleandir(distDir);
  await mkdir(path.join(distDir, "consents"));
  await mkdir(path.join(distDir, "studies"));
  await mkdir(path.join(distDir, "tasks"));

  await processTasks(distDir);
  await processStudies(distDir);

  // Create deployment zip
  const zip = new JSZip();
  const zipFolder = zip.folder("study-configuration");

  // Add the folder contents to the zip
  await addFolderToZip(zip, distDir, zipFolder);

  // Generate the zip file and save it
  const zipContent = await zip.generateAsync({ type: "nodebuffer" });
  await fs.promises.writeFile(
    path.join(__dirname, "../dist/study-configuration.zip"),
    zipContent
  );
})();

// Thanks chatgpt
async function addFolderToZip(zip, folderPath, zipFolder) {
  const files = await fs.promises.readdir(folderPath);

  for (const fileName of files) {
    const filePath = path.join(folderPath, fileName);
    const stat = await fs.promises.stat(filePath);

    if (stat.isDirectory()) {
      // Create a folder in the zip
      const newFolder = zipFolder.folder(fileName);
      // Recursively add subfolders and files
      await addFolderToZip(zip, filePath, newFolder);
    } else {
      // Read the file content and add it to the zip
      const fileData = await fs.promises.readFile(filePath);
      zipFolder.file(fileName, fileData);
    }
  }
}
