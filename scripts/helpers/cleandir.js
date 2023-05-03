const fs = require("fs");
const path = require("path");

function cleandir(dir) {
  fs.statSync(dir);
  const items = fs.readdirSync(dir);
  items.forEach((item) =>
    fs.rmSync(path.join(dir, item), { recursive: true, force: true })
  );
}

module.exports = cleandir;
