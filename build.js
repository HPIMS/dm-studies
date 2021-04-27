const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const YAML = require("yaml");

const validateSchema = require("./validate_schema");

const versions = YAML.parse(
  fs.readFileSync("./version.lock", { encoding: "utf-8" })
);

const surveyLibrary = new Set();

const diffs = new Map();
diffs.set("studies", new Map());
diffs.set("surveys", new Map());

async function mkdir(path) {
  try {
    await fs.promises.stat(path);
  } catch (err) {
    await fs.promises.mkdir(path, { recursive: true });
  }
}

async function processStudies() {
  const distDir = `${__dirname}/dist/`;
  const studies = await fs.promises.readdir(`${__dirname}/studies`);

  studies.forEach(async (studyKey) => {
    const studyDir = `${__dirname}/studies/${studyKey}`;

    const studyConfig = YAML.parse(
      await fs.promises.readFile(`${studyDir}/study.yaml`, {
        encoding: "utf-8",
      })
    );

    // process images
    const images = await fs.promises.readdir(`${studyDir}/images`);
    images.forEach(async (image) => {
      if (image.startsWith("banner")) {
        const extension = image.split(".").pop();
        await fs.promises.copyFile(
          `${studyDir}/images/${image}`,
          `${distDir}/images/${studyKey}.${extension}`
        );
      } else {
        await fs.promises.copyFile(
          `${studyDir}/images/${image}`,
          `${distDir}/images/${studyKey}.${image}`
        );
      }
    });

    // process surveys
    try {
      const surveys = await fs.promises.readdir(`${studyDir}/surveys`);
      surveys.forEach(async (survey) => {
        processSurvey(`${studyDir}/surveys/${survey}`);
      });
    } catch (err) {
      // absorb the error if it's because the study has no study specific surveys
      if (err.code !== "ENOENT" || err.syscall !== "scandir") {
        throw err;
      }
    }
  });
}

async function processSurvey(surveyPath) {
  const relativePath = path.relative(process.cwd(), surveyPath);
  const file = fs.promises.readFile(surveyPath, { encoding: "utf-8" });

  const fileName = "blah";

  const hash = crypto.createHash("md5").update(file).digest("hex");
  const cfg = YAML.parse(file);

  /*
  // Validate the survey
  if (fileName !== cfg.key) {
    throw new Error(`Key and Filename mismatch: (survey) ${file}"`);
  }

  const schemaErrors = validateSchema("survey", data);
  if (schemaErrors.length) {
    console.error(schemaErrors);
    throw new Error(`Schema validation failed for "${name}"`);
  }
  */
  //

  //
  //

  //
  //
}

async function build() {
  await Promise.all([
    mkdir(`${__dirname}/dist/images`),
    mkdir(`${__dirname}/dist/studies`),
    mkdir(`${__dirname}/dist/surveys`),
  ]);
  processStudies();
}
build();
/*

const surveyCfgMap = {};

async function mkdir(path) {
  try {
    await fs.promises.stat(path);
  } catch (err) {
    await fs.promises.mkdir(path, { recursive: true });
  }
}

async function copyDirectory(type) {
  const dir = `${__dirname}/${type}`;
  const files = await fs.promises.readdir(dir);

  const promises = files.map(async (file) => {
    const src = `${dir}/${file}`;
    const dest = `${__dirname}/dist/${type}/${file}`;
    await fs.promises.copyFile(src, dest);
  });
  return Promise.all(promises);
}

async function processStudies() {
  const index = [];

  const files = await fs.promises.readdir(`${__dirname}/studies`);
  const promises = files.map(async (file) => {
    const path = `${__dirname}/studies/${file}`;
    const [key] = file.split(".yaml");
    const [, version] = versions.studies[key];

    const data = YAML.parse(
      await fs.promises.readFile(path, { encoding: "utf-8" })
    );
    data.version = version;

    data.surveys = data.surveys.map((s) => ({
      key: s,
      ...surveyCfgMap[s],
    }));

    index.push({
      key: key,
      name: data.name,
      description: data.description,
      consentId: data.consentId,
      wearables: data.wearables,
    });

    await fs.promises.writeFile(
      `${__dirname}/dist/studies/${key}.json`,
      JSON.stringify(data)
    );
  });

  await Promise.all(promises);
  await fs.promises.writeFile(
    `${__dirname}/dist/studies/index.json`,
    JSON.stringify(index)
  );
}

async function processSurveys() {
  const index = [];

  const files = await fs.promises.readdir(`${__dirname}/surveys`);
  const promises = files.map(async (file) => {
    const path = `${__dirname}/surveys/${file}`;
    const [key] = file.split(".yaml");
    const [, version] = versions.surveys[key];

    const {
      period,
      name,
      short,
      repeat,
      timeEstimate,
      intro,
      outro,
      ...data
    } = YAML.parse(await fs.promises.readFile(path, { encoding: "utf-8" }));
    data.version = version;

    const surveyCfg = {
      version,
      period,
      timeEstimate,
      name,
      short,
      repeat,
    };
    surveyCfgMap[key] = surveyCfg;
    index.push({ key, name, description: short });

    await fs.promises.writeFile(
      `${__dirname}/dist/surveys/${key}.json`,
      // restructure for backwards compatibility
      JSON.stringify({ ...data, ...intro, completed: outro })
    );
  });

  await Promise.all(promises);
  await fs.promises.writeFile(
    `${__dirname}/dist/surveys/index.json`,
    JSON.stringify(index)
  );
}

async function build() {
  await Promise.all([
    mkdir(`${__dirname}/dist/images`),
    mkdir(`${__dirname}/dist/studies`),
    mkdir(`${__dirname}/dist/surveys`),
  ]);
  await processSurveys();
  await processStudies();
  await copyDirectory("images");
  await fs.promises.writeFile(
    `${__dirname}/dist/versions.json`,
    JSON.stringify(versions)
  );
}
build();

*/
