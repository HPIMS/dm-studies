const YAML = require("yaml");
const fs = require("fs");

async function getFile(path) {
  const data = await fs.promises.readFile(path, { encoding: "utf-8" });
  return JSON.parse(data);
}

async function doThing() {
  const dir = `${__dirname}/surveys_old`;

  const files = await fs.promises.readdir(dir);
  const promises = files.map(async (file) => {
    const path = `${dir}/${file}`;
    const json = await getFile(path);
    await fs.promises.writeFile(
      `${__dirname}/surveys/${file}`,
      YAML.stringify(json)
    );
  });

  await Promise.all(promises);
}

doThing();
