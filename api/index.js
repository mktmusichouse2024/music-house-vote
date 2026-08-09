const serverModule = require('../dist/server.cjs');
const app = serverModule.default || serverModule.app || serverModule;

module.exports = (req, res) => {
  return app(req, res);
};
