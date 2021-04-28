const fs = require("fs");
const YAML = require("yaml");

const versions = YAML.parse(
  fs.readFileSync("./version.lock", { encoding: "utf-8" })
);

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

    const { period, name, short, repeat, timeEstimate, ...data } = YAML.parse(
      await fs.promises.readFile(path, { encoding: "utf-8" })
    );
    data.version = version;

    const surveyCfg = {
      version,
      period,
      timeEstimate,
      name,
      short,
      repeat,
      editable: data.editable,
    };
    surveyCfgMap[key] = surveyCfg;
    index.push({ key, name, description: short });

    await fs.promises.writeFile(
      `${__dirname}/dist/surveys/${key}.json`,
      JSON.stringify(data)
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
