const printf = require("../js/env/tools/print_f");
const ConfReader = require("../js/utils/configReader");
const log = require("../js/utils/log");

const config = new ConfReader("conf").build();
const MAPPER_DB_NAME = config.db.names.mapper;

const installMapperDB = async function (client) {
  log(log.INFO, `Install ${MAPPER_DB_NAME} db...`);
  await client.query(printf('DROP DATABASE IF EXISTS "%s";', MAPPER_DB_NAME));
  await client.query(printf('CREATE DATABASE "%s";', MAPPER_DB_NAME));
  log(log.INFO, `Installed ${MAPPER_DB_NAME}.`);
};

module.exports = installMapperDB;
