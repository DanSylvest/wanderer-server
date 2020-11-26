const printf     = require('./../env/tools/print_f');
const ConfReader = require("./../utils/configReader");
const log        = require("./../utils/log.js");

const config = new ConfReader("conf").build();
const MAPPER_DB_NAME = config.db.names.mapper;

var installMapperDB = async function (client, conString) {
    log(log.INFO, `Install ${MAPPER_DB_NAME} db...`);
    await client.query(printf("DROP DATABASE IF EXISTS \"%s\";", MAPPER_DB_NAME));
    await client.query(printf("CREATE DATABASE \"%s\";", MAPPER_DB_NAME));
    log(log.INFO, `Installed ${MAPPER_DB_NAME}.`);
};

module.exports = installMapperDB;