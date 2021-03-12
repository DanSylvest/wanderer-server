const pg                = require('pg');
const ConfReader        = require("./../../utils/configReader");
const log               = require("./../../utils/log.js");

const config = new ConfReader("conf").build();
const MAPPER_DB = config.db.names.mapper;

const conString = `postgres://${config.db.user}:${config.db.password}@${config.db.host}`;
const client = new pg.Client(`${conString}/${MAPPER_DB}`);
client.connect();


const updateCharactersRow = async function (id, date) {
    let converted = JSON.parse(Buffer.from(date, 'base64').toString('utf8'))
    let query = `UPDATE public.characters
SET "addDate" = '${converted}'
WHERE "id"='${id}';`;

    console.log(query);
    await client.query(query);
    console.log("done");

}

const updateCharacters = async function () {
    let result = await client.query(`SELECT t.id
     , t."addDate"
FROM public.characters t`);

    await Promise.all(result.rows.map(row => updateCharactersRow(row.id, row.addDate)));
}

const updateTokensRow = async function (id, date) {
    let converted = JSON.parse(Buffer.from(date, 'base64').toString('utf8'))
    let query = `UPDATE public.tokens
SET "expire" = '${converted}'
WHERE "id"='${id}';`;

    console.log(query);
    await client.query(query);
    console.log("done");

}

const updateTokens = async function () {
    let result = await client.query(`SELECT t.id
     , t."expire"
FROM public.tokens t`);

    await Promise.all(result.rows.map(row => updateTokensRow(row.id, row.expire)));
}

const update = async function () {
    await updateCharacters();
    await updateTokens();
}

update();

