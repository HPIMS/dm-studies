const fs = require("fs");

async function mkdir(path) {
  try {
    await fs.promises.stat(path);
  } catch (err) {
    await fs.promises.mkdir(path, { recursive: true });
  }
}

async function minifyFile(path) {
  const data = await fs.promises.readFile(path, { encoding: "utf-8" });
  return JSON.stringify(JSON.parse(data));
}

async function minifyDirectory(type) {
  const dir = `${__dirname}/${type}`;
  const files = await fs.promises.readdir(dir);

  const promises = files.map(async (file) => {
    const path = `${dir}/${file}`;
    const json = await minifyFile(path);
    await fs.promises.writeFile(`${__dirname}/dist/${type}/${file}`, json);
  });
  return Promise.all(promises);
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

async function build() {
  await Promise.all([
    mkdir(`${__dirname}/dist/images`),
    mkdir(`${__dirname}/dist/studies`),
    mkdir(`${__dirname}/dist/surveys`),
  ]);
  return Promise.all([
    minifyDirectory("studies"),
    minifyDirectory("surveys"),
    copyDirectory("images"),
  ]);
}
build();
