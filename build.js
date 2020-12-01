const fs = require("fs/promises");

async function minifyFile(path) {
  const data = await fs.readFile(path, { encoding: "utf-8" });
  return JSON.stringify(data);
}

async function processDirectory(type) {
  const dir = `${__dirname}/${type}`;
  const files = await fs.readdir(dir);

  const promises = files.map(async (file) => {
    const path = `${dir}/${file}`;
    const json = await minifyFile(path);
    await fs.writeFile(path, json);
  });
  return Promise.all(promises);
}

function build() {
  processDirectory("studies");
  processDirectory("surveys");
}
build();
