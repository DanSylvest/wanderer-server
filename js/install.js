const CustomPromise   = require('./env/promise');
const pg              = require('pg');
const Path            = require('./env/tools/path');
const printf          = require('./env/tools/print_f');
const child_process   = require('child_process');
const fs              = require('fs');

global.projectPath = __dirname;
const ConfReader = require("./utils/configReader");
const config = new ConfReader("conf").build();

const EVE_SDE_DB_NAME     = config.db.names.eveSde;
const EVE_MANUAL_DB_NAME  = config.db.names.eveManual;
const MAPPER_DB_NAME      = config.db.names.mapper;

const conString = `postgres://${config.db.user}:${config.db.password}@${config.db.host}`;
const dirPath   = Path.fromBackSlash(__dirname);

const client = new pg.Client(conString);


var exec = function (_command) {
    var pr = new CustomPromise();

    child_process.exec(_command, {shell: true}, function (_err, _in, _out) {
        if(_err)
            pr.reject(_err);
        else
            pr.resolve();
    });

    return pr.native;
}

var searchDumpFile = function (_path) {
    var list = fs.readdirSync(_path.toString());

    if(list.length === 0)
        throw "EVE SDE Dump file not exists";

    return list[0];
};


var installRole = async function () {
    console.log("Create role yaml (for sde restore)...");
    var queryRole = `DO
    $do$
    BEGIN
       IF NOT EXISTS (
          SELECT FROM pg_catalog.pg_roles
          WHERE  rolname = 'yaml') THEN
    
          CREATE ROLE yaml LOGIN PASSWORD '';
       END IF;
    END
    $do$;`;

    await client.query(queryRole);
    console.log("Created");
};

var installManualDb = async function () {
    console.log("Start Loading ManualDB database...");
    console.log(`Install ${EVE_MANUAL_DB_NAME} db...`);
    await client.query(printf("DROP DATABASE IF EXISTS \"%s\";", EVE_MANUAL_DB_NAME));
    await client.query(printf("CREATE DATABASE \"%s\";", EVE_MANUAL_DB_NAME));
    await exec(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("effects_new.sql").toString()));
    await exec(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("signature_oregas.sql").toString()));
    await exec(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("signatures.sql").toString()));
    await exec(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("signature_waves.sql").toString()));
    await exec(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("sleepers.sql").toString()));
    await exec(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("wanderingwormholes.sql").toString()));
    await exec(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("wormholeclassifications.sql").toString()));
    await exec(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("wormholesystems_new.sql").toString()));
    await exec(printf("psql %s/%s < %s", conString, EVE_MANUAL_DB_NAME, dirPath["+"]("db/sql")["+"]("user_reported_statics.sql").toString()));
    console.log(`Installed ${EVE_MANUAL_DB_NAME}.`);
};

var installSDE = async function () {
    console.log("Start Loading SDE database...");
    var dumpFile = searchDumpFile(dirPath["+"]("db/sdeDump"));
    console.log(`Install ${EVE_SDE_DB_NAME} db...`);
    await client.query(printf("DROP DATABASE IF EXISTS \"%s\";", EVE_SDE_DB_NAME));
    await client.query(printf("CREATE DATABASE \"%s\";", EVE_SDE_DB_NAME));
    console.log(`Restore dump database ${dumpFile} for ${EVE_SDE_DB_NAME}.`);
    await exec(printf("pg_restore --no-privileges --dbname=%s/%s %s", conString, EVE_SDE_DB_NAME, dirPath["+"]("db/sdeDump")["+"](dumpFile).toString()));
    console.log(`Installed ${EVE_SDE_DB_NAME}.`);
}

var installMapperDB = async function () {
    console.log(`Install ${MAPPER_DB_NAME} db...`);
    await client.query(printf("DROP DATABASE IF EXISTS \"%s\";", MAPPER_DB_NAME));
    await client.query(printf("CREATE DATABASE \"%s\";", MAPPER_DB_NAME));
    console.log(`Installed ${MAPPER_DB_NAME}.`);
};

var start = async function () {
    client.connect();

    try {
        await installRole();
        await installManualDb();
        await installSDE();
        await installMapperDB();
        console.log("Installed");
    } catch (_err) {
        console.log(_err);
        console.log("Installed with error (check previously message)");
    }

    process.exit();
};

start();


