const Path        = require('../js/env/tools/path');
const printf      = require('../js/env/tools/print_f');
const fs          = require('fs');
const execProcess = require("../js/env/execProcess");
const ConfReader  = require("../js/utils/configReader");
const log         = require("../js/utils/log.js");

const config = new ConfReader("conf").build();
const EVE_SDE_DB_NAME  = config.db.names.eveSde;
const dirPath  = Path.fromBackSlash(__dirname);
dirPath.pop();

const searchDumpFile = function (_path) {
    var list = fs.readdirSync(_path.toString());

    if(list.length === 0)
        throw "EVE SDE Dump file not exists";

    return list[0];
};

const installSDE = async function (client, conString) {
    log(log.INFO, "Start Loading SDE database...");
    let dumpFile = searchDumpFile(dirPath["+"]("eveData/sdeDump"));
    log(log.INFO, `Install ${EVE_SDE_DB_NAME} db...`);
    await client.query(`DROP DATABASE IF EXISTS "${EVE_SDE_DB_NAME}";`);
    await client.query(`CREATE DATABASE "${EVE_SDE_DB_NAME}";`);
    log(log.INFO, `Restore dump database ${dumpFile} for ${EVE_SDE_DB_NAME}. ~(2-3 min)`);
    await execProcess(printf("pg_restore --no-privileges --dbname=%s/%s %s", conString, EVE_SDE_DB_NAME, dirPath["+"]("db/sdeDump")["+"](dumpFile).toString()));
    log(log.INFO, `Installed ${EVE_SDE_DB_NAME}.`);
}

module.exports = installSDE;