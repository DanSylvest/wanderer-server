const Path        = require('./../env/tools/path');
const printf      = require('./../env/tools/print_f');
const execProcess = require("./../env/execProcess");
const ConfReader  = require("./../utils/configReader");
const log         = require("./../utils/log.js");

const config = new ConfReader("conf").build();
const EVE_MANUAL_DB_NAME  = config.db.names.eveManual;
const dirPath   = Path.fromBackSlash(__dirname);
dirPath.pop();

const installManualDb = async function (client, conString) {
    log(log.INFO, "Start Loading ManualDB database...");
    log(log.INFO, `Install ${EVE_MANUAL_DB_NAME} db...`);
    await client.query(printf("DROP DATABASE IF EXISTS \"%s\";", EVE_MANUAL_DB_NAME));
    await client.query(printf("CREATE DATABASE \"%s\";", EVE_MANUAL_DB_NAME));
    await execProcess(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("effects_new.sql").toString()));
    await execProcess(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("signature_oregas.sql").toString()));
    await execProcess(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("signatures.sql").toString()));
    await execProcess(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("signature_waves.sql").toString()));
    await execProcess(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("sleepers.sql").toString()));
    await execProcess(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("wanderingwormholes.sql").toString()));
    await execProcess(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("wormholeclassifications.sql").toString()));
    await execProcess(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("wormholesystems_new.sql").toString()));
    await execProcess(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("user_reported_statics.sql").toString()));
    log(log.INFO, `Installed ${EVE_MANUAL_DB_NAME}.`);
};

module.exports = installManualDb;