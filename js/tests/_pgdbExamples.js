/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/28/20.
 */

const { Pool, Client } = require('pg');

var test = async function () {
    const client = new Client({
        user: "pguser",
        host: '127.0.0.1',
        database: 'mapper',
        password: '',
        port: 5432,
    });
    client.connect();

    var result = await client.query('SELECT name, owner FROM public.kek;');


    result = await client.query(`SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_name   = 'kek2'
   );`);
    debugger;

};

// test();