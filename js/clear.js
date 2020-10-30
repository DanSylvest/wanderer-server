const pg              = require('pg');
const printf          = require('./env/tools/print_f');

global.projectPath = __dirname;
const ConfReader = require("./utils/configReader");
const config = new ConfReader("conf").build();
const MAPPER_DB_NAME      = config.db.names.mapper;
const conString = "postgres://postgres:KEK@localhost";
const client = new pg.Client(conString);


var installMapperDB = async function () {
    console.log(`Clear ${MAPPER_DB_NAME} db...`);
    await client.query(printf("DROP DATABASE IF EXISTS \"%s\";", MAPPER_DB_NAME));
    await client.query(printf("CREATE DATABASE \"%s\";", MAPPER_DB_NAME));
    console.log(`Cleared ${MAPPER_DB_NAME}.`);
};

var start = async function () {
    client.connect();

    try {
        await installMapperDB();
    } catch (_err) {
        console.log(_err);
        console.log("Cleared with error (check previously message)");
    }

    process.exit();
};

start();


