/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 4/11/20.
 */

global.projectPath = __dirname;
require("./env/tools/standardTypeExtend");

var ConfReader = require("./utils/configReader");
global.config = new ConfReader("conf").build();

var handlers   = require("./api/_dir");
var Api        = require("./api");
var Controller = require("./core/controller");


var main = async function () {

    global.core = new Controller();
    await global.core.init();

    global.api = new Api({
        handlers: handlers
    });

    global.core.postInit();

};

main();

// require("./tests/_levelDBExamples");
// require("./tests/_pgdbExamples");
// require("./tests/_testESI");