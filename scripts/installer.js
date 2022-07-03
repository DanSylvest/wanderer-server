const pg                 = require('pg');
const ConfReader         = require("../js/utils/configReader");
const reinstallEveDb     = require("./reinstallEveDb");
const reinstallMapperDb  = require("./reinstallMapperDb");
const reinstallCachedDB  = require("./reinstallCachedESD");
const generateSwagger    = require("./generateSwagger.js");
const cloneStableSwagger = require("./cloneStableSwagger.js");
const clearSignatures    = require("./clearSignatures.js");
const args               = require("args");
const log                = require("../js/utils/log.js");

const config = new ConfReader("conf").build();
const MAPPER_DB = config.db.name;

const conString = `postgres://${config.db.user}:${config.db.password}@${config.db.host}`;
const client = new pg.Client(`${conString}/${MAPPER_DB}`);
client.connect();

var installRole = async function () {
    log(log.INFO, "Create role yaml (for sde restore)...");
    console.log(conString);
    var queryRole = `DO
    $do$
    BEGIN
       IF NOT EXISTS (
          SELECT FROM pg_catalog.pg_roles
          WHERE  rolname = 'yaml') THEN
    
          CREATE ROLE yaml LOGIN PASSWORD '';
       END IF;
       GRANT yaml TO ${config.db.user};
    END
    $do$;`;

    await client.query(queryRole);
    log(log.INFO, "Created");
};

const processUpdateCommand = async function (_command, _flags) {
    if(_flags.length === 0) _flags.push("all");

    // try {
        for (let a = 0; a < _flags.length; a++) {
            switch (_flags[a]) {
                case "cached":
                    await reinstallCachedDB(client, conString);
                    break;
                case "clearSignatures":
                    await clearSignatures(client, conString);
                    break;
                case "swagger":
                    await generateSwagger();
                    break;
                case "clone-swagger":
                    await cloneStableSwagger();
                    break;
                case "mapper":
                    await reinstallMapperDb(client, conString);
                    break;
                case "eve":
                    await reinstallEveDb(client, conString);
                    break;
                case "all":
                    await reinstallMapperDb(client, conString);
                    await reinstallEveDb(client, conString);
                    await cloneStableSwagger();
                    break;
            }
        }
    // } catch (_err) {
    //     log(log.INFO, _err);
    //     log(log.INFO, "Installed with error (check previously message)");
    // }

    process.exit()
};

const processInstall = async function () {
    try {
        await installRole();
        await reinstallEveDb(client, conString);
        await reinstallMapperDb(client, conString);
        await reinstallCachedDB(client, conString);
        await generateSwagger(client, conString);
        log(log.INFO, "Installed");
    } catch (_err) {
        log(log.INFO, _err);
        log(log.INFO, "Installed with error (check previously message)");
    }

    process.exit()
};

args.command('update', 'Update [swagger/clone-swagger/mapper/eve/other/all] or [mapper eve] default is all', processUpdateCommand);
args.command('install', 'Will install all', processInstall);
args.parse(process.argv);

