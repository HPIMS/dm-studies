const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

async function mkdir(path) {
  try {
    await fs.promises.stat(path);
  } catch (err) {
    await fs.promises.mkdir(path, { recursive: true });
  }
}

async function getFile(dir, group, file) {
  const rawData = await fs.promises.readFile(path.join(dir, group, file), {
    encoding: "utf-8",
  });
  return YAML.parse(rawData) || {};
}

async function doMigrateSurveys() {
  const inDir = path.join(__dirname, "../cfg/surveys");
  const outDir = path.join(__dirname, "../cfg/tasks");

  const surveyGroups = await fs.promises.readdir(inDir);

  const promises = surveyGroups.map(async (surveyGroup) => {
    const groupDir = `${inDir}/${surveyGroup}`;
    const surveys = await fs.promises.readdir(groupDir);

    const surveyPromises = surveys.map(async (file) => {
      const survey = await getFile(inDir, surveyGroup, file);

      survey.type = "task";
      survey.sections = survey.sections?.map((section) => ({
        type: "survey",
        ...section,
      }));

      await mkdir(path.join(outDir, surveyGroup));
      await fs.promises.writeFile(
        path.join(outDir, surveyGroup, file),
        `${YAML.stringify(survey, { sortMapEntries: false })}\n`
      );
    });

    return Promise.all(surveyPromises);
  });

  return Promise.all(promises);
}

doMigrateSurveys();
