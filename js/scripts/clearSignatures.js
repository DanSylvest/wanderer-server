/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 1/9/21.
 */

const Path        = require('./../env/tools/path');
const ConfReader  = require("./../utils/configReader");
const log         = require("./../utils/log.js");
const Client      = require('pg').Client;

const config = new ConfReader("conf").build();
const EVE_MAPPER_DB_NAME  = config.db.names.mapper;
const dirPath  = Path.fromBackSlash(__dirname);
dirPath.pop();

const clearSignatures = async function (client, conString) {
    log(log.INFO, "Start Clear Signatures database...");
    this.mapperDB = new Client(`${conString}/${EVE_MAPPER_DB_NAME}`);
    this.mapperDB.connect();
    await this.mapperDB.query('SELECT NOW()');
    await this.mapperDB.query(`UPDATE public.map_systems SET "signatures" = 'W10='`);
    log(log.INFO, "Signatures was clear...");
}

module.exports = clearSignatures;