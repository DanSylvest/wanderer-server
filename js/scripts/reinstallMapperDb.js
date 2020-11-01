const printf     = require('./../env/tools/print_f');
const ConfReader = require("./../utils/configReader");

const config = new ConfReader("conf").build();
const MAPPER_DB_NAME = config.db.names.mapper;

var installMapperDB = async function (client, conString) {
    console.log(`Install ${MAPPER_DB_NAME} db...`);
    await client.query(printf("DROP DATABASE IF EXISTS \"%s\";", MAPPER_DB_NAME));
    await client.query(printf("CREATE DATABASE \"%s\";", MAPPER_DB_NAME));
    console.log(`Installed ${MAPPER_DB_NAME}.`);
};

module.exports = installMapperDB;