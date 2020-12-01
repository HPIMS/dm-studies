const fs = require("fs/promises");

async function minifyFile(path) {
  const data = await fs.readFile(path, { encoding: "utf-8" });
  return JSON.stringify(JSON.parse(data));
}

async function minifyDirectory(type) {
  const dir = `${__dirname}/${type}`;
  const files = await fs.readdir(dir);

  const promises = files.map(async (file) => {
    const path = `${dir}/${file}`;
    const json = await minifyFile(path);
    await fs.writeFile(`${__dirname}/dist/${type}`, json);
  });
  return Promise.all(promises);
}

async function copyDirectory(type) {
  const dir = `${__dirname}/${type}`;
  const files = await fs.readdir(dir);

  const promises = files.map(async (file) => {
    const src = `${dir}/${file}`;
    const dest = `${__dirname}/dist/${type}`;
    await fs.copyFile(src, dest);
  });
  return Promise.all(promises);
}

function build() {
  minifyDirectory("studies");
  minifyDirectory("surveys");
  copyDirectory("images");
}
build();
