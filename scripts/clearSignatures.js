/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 1/9/21.
 */

const { Client } = require("pg");
const Path = require("../js/env/tools/path");
const ConfReader = require("../js/utils/configReader");
const log = require("../js/utils/log");

const config = new ConfReader("conf").build();
const EVE_MAPPER_DB_NAME = config.db.names.mapper;
const dirPath = Path.fromBackSlash(__dirname);
dirPath.pop();

const clearSignatures = async function (client, conString) {
  log(log.INFO, "Start Clear Signatures database...");
  this.mapperDB = new Client(`${conString}/${EVE_MAPPER_DB_NAME}`);
  this.mapperDB.connect();
  await this.mapperDB.query("SELECT NOW()");
  await this.mapperDB.query(
    "UPDATE public.map_systems SET \"signatures\" = 'W10='",
  );
  log(log.INFO, "Signatures was clear...");
};

module.exports = clearSignatures;
