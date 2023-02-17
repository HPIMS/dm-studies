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
      const { short, ...ret } = survey;

      ret.type = "task";
      ret.sections = ret.sections?.map((section) => ({
        type: "survey",
        ...section,
      }));

      await mkdir(path.join(outDir, surveyGroup));
      await fs.promises.writeFile(
        path.join(outDir, surveyGroup, file),
        `${YAML.stringify(ret, { sortMapEntries: false })}\n`
      );
    });

    return Promise.all(surveyPromises);
  });

  return Promise.all(promises);
}

async function doMigrateMultimedia() {
  const inDir = path.join(__dirname, "../cfg/multimedia");
  const outDir = path.join(__dirname, "../cfg/tasks");

  const mediaGroups = await fs.promises.readdir(inDir);

  const promises = mediaGroups.map(async (mediaGroup) => {
    const groupDir = `${inDir}/${mediaGroup}`;
    const mediaFiles = await fs.promises.readdir(groupDir);

    const mediaPromises = mediaFiles.map(async (file) => {
      const media = await getFile(inDir, mediaGroup, file);

      const {
        short,
        autoplay,
        beginMuted,
        controls,
        rate,
        resizeMode,
        minimumWatchThreshold,
        ...ret
      } = media;

      ret.type = "task";
      ret.sections = [
        {
          type: "video",
          key: ret.key,
          videoId: ret.key,
          autoplay,
          beginMuted,
          controls,
          rate,
          resizeMode,
          minimumWatchThreshold,
        },
      ];

      if (ret.intro && !ret.intro.title && !ret.intro.description) {
        delete ret.intro;
      }

      if (ret.outro && !ret.outro.title && !ret.outro.description) {
        delete ret.outro;
      }

      await mkdir(path.join(outDir, mediaGroup));
      await fs.promises.writeFile(
        path.join(outDir, mediaGroup, file),
        `${YAML.stringify(ret, { sortMapEntries: false })}\n`
      );
    });

    return Promise.all(mediaPromises);
  });

  return Promise.all(promises);
}

doMigrateSurveys();
// doMigrateMultimedia();
