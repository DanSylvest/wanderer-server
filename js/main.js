/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 4/11/20.
 */

global.projectPath = __dirname;
require("./env/tools/standardTypeExtend");

const ConfReader = require("./utils/configReader");

global.config = new ConfReader("conf").build();

const handlers = require("./api/_dir");
const Api = require("./api");
const Controller = require("./core/controller");

const main = async function () {
  global.core = new Controller();
  await global.core.init();

  global.api = new Api({
    handlers,
  });

  global.core.postInit();
};

main();

// require("./tests/_levelDBExamples");
// require("./tests/_pgdbExamples");
// require("./tests/_testESI");
