const fs = require("fs");
const YAML = require("yaml");

async function mkdir(path) {
  try {
    await fs.promises.stat(path);
  } catch (err) {
    await fs.promises.mkdir(path, { recursive: true });
  }
}

async function processSurveys() {
  //
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
