function waterfall(fns) {
  return fns.reduce((p, fn) => p.then(fn), Promise.resolve());
}

module.exports = waterfall;
