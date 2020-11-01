const Path        = require('./../env/tools/path');
const printf      = require('./../env/tools/print_f');
const fs          = require('fs');
const execProcess = require("./../env/execProcess");
const ConfReader  = require("./../utils/configReader");

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
    console.log("Start Loading SDE database...");
    var dumpFile = searchDumpFile(dirPath["+"]("db/sdeDump"));
    console.log(`Install ${EVE_SDE_DB_NAME} db...`);
    await client.query(printf("DROP DATABASE IF EXISTS \"%s\";", EVE_SDE_DB_NAME));
    await client.query(printf("CREATE DATABASE \"%s\";", EVE_SDE_DB_NAME));
    console.log(`Restore dump database ${dumpFile} for ${EVE_SDE_DB_NAME}.`);
    await execProcess(printf("pg_restore --no-privileges --dbname=%s/%s %s", conString, EVE_SDE_DB_NAME, dirPath["+"]("db/sdeDump")["+"](dumpFile).toString()));
    console.log(`Installed ${EVE_SDE_DB_NAME}.`);
}

module.exports = installSDE;