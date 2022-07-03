const Path        = require('../js/env/tools/path');
const fs          = require('fs');
const ConfReader  = require("../js/utils/configReader");
const log         = require("../js/utils/log.js");
const Client      = require('pg').Client;
const exist       = require("../js/env/tools/exist");
const DB          = require("../js/utils/db");
require("../js/env/tools/standardTypeExtend");

const config = new ConfReader("conf").build();
const CACHED_DB = config.db.names.cachedESD;
const EVE_STATIC_DATA_DB = config.db.names.eveSde;
const dirPath  = Path.fromBackSlash(__dirname);
dirPath.pop();

let conString, client;

class buildSolarSystemTable {
    async build () {
        log(log.INFO, "Start building Cache database...");
        await this.init();
        await this.createTable();
        await this.pass();
        log(log.INFO, "Complete build cache db...");
    }

    async init () {
        await client.query(`DROP DATABASE IF EXISTS "${CACHED_DB}";`);
        await client.query(`CREATE DATABASE "${CACHED_DB}";`);

        this.cacheDb = new DB({
            isTruncatable: false,
            client: new Client(`${conString}/${CACHED_DB}`)
        });

        log(log.INFO, `${conString}/${CACHED_DB}`);
        log(log.INFO, `${conString}/${EVE_STATIC_DATA_DB}`);
        this.staticDb = new Client(`${conString}/${EVE_STATIC_DATA_DB}`);


        let path =  dirPath["+"](["db", "json"]);
        this.wormholeClassesInfo = JSON.parse(fs.readFileSync(path["+"]("wormholeClassesInfo.json").toString(), "utf8"));
        this.shatteredConstellations = JSON.parse(fs.readFileSync(path["+"]("shatteredConstellations.json").toString(), "utf8"));

        this.effects = JSON.parse(fs.readFileSync(path["+"]("effects.json").toString(), "utf8"));
        this.wormholeClasses = JSON.parse(fs.readFileSync(path["+"]("wormholeClasses.json").toString(), "utf8"));
        // this.wormholes = JSON.parse(fs.readFileSync(path["+"]("wormholes.json").toString(), "utf8"));
        this.wormholeSystems = JSON.parse(fs.readFileSync(path["+"]("wormholeSystems.json").toString(), "utf8"));
        this.triglavianSystems = JSON.parse(fs.readFileSync(path["+"]("triglavianSystems.json").toString(), "utf8"));

        this.staticDb.connect();
        await this.staticDb.query('SELECT NOW()');
        await this.cacheDb.init();
    }

    async createTable () {
        this.solarSystemsTable = this.cacheDb.createTable({
            enableLog: false,
            name: "solar_systems",
            idField: "id",
            properties: [
                {name: "systemClass",              type: Number},
                {name: "security",                 type: String},
                {name: "solarSystemId",            type: Number},
                {name: "constellationId",          type: Number},
                {name: "regionId",                 type: Number},
                {name: "solarSystemName",          type: String},
                {name: "constellationName",        type: String},
                {name: "regionName",               type: String},
                {name: "typeDescription",          type: String},
                {name: "classTitle",               type: String},
                {name: "isShattered",              type: Boolean},
                {name: "effectName",               type: String},
                {name: "effectPower",              type: Number},
                {name: "statics",                  type: Array},
                {name: "wanderers",                type: Array},
                {name: "solarSystemNameLC",        type: String},
                {name: "triglavianInvasionStatus", type: String},
            ]
        });
        await this.solarSystemsTable.init();
    }

    async pass () {
        let result = await this.staticDb.query(`SELECT t."regionID"
     , t."constellationID"
     , t."solarSystemID"
     , t."solarSystemName"
     , t.security
     , t."factionID"
FROM public."mapSolarSystems" t
ORDER BY t."solarSystemID"`);

        log(log.INFO, `Elements count "${result.rows.length}"`);
        let prarr = [];

        for(let a = 0; a < result.rows.length; a++) {
            let solarSystemInfo = result.rows[a];
            let constellationName = await this.constellationName(solarSystemInfo.constellationID);
            let regionName = await this.regionName(solarSystemInfo.regionID);
            let wormholeClassID = await this.systemClass(solarSystemInfo.regionID, solarSystemInfo.constellationID, solarSystemInfo.solarSystemID);

            let security = solarSystemInfo.security;
            let effectPower = 0;

            security = solarSystemInfo.security;
            if(security === -0.99)
                security = -1.0;

            security = security.toFixed(1);

            let wormholeClass = this.wormholeClasses.searchByObjectKey("wormholeClassID", wormholeClassID);
            let classTitle = wormholeClass.shortName;
            switch (wormholeClassID) {
                case this.wormholeClassesInfo.names.hs:
                case this.wormholeClassesInfo.names.ls:
                case this.wormholeClassesInfo.names.ns:
                    classTitle = security.toString();
                    break;
            }

            let typeDescription = wormholeClass.title;
            let isShattered = !!this.shatteredConstellations[solarSystemInfo.constellationID];
            let effectName = "", statics = [], wanderers = [];

            let wormholeData = this.wormholeSystems.searchByObjectKey("solarSystemID", solarSystemInfo.solarSystemID);
            if(wormholeData) {
                effectPower = wormholeClass.effectPower;
                effectName = wormholeData.effectName;
                statics = wormholeData.statics;
                wanderers = wormholeData.wanderers;
            }

            let trigInfo = this.triglavianSystems.searchByObjectKey("solarSystemID", solarSystemInfo.solarSystemID);
            let triglavianInvasionStatus = "Normal";
            if(exist(trigInfo)) {
                triglavianInvasionStatus = trigInfo.invasionStatus;
                effectPower = trigInfo.effectPower;
                effectName = trigInfo.effectName;
            }

            prarr.push(this.solarSystemsTable.add({
                systemClass: wormholeClassID,
                security: security,
                solarSystemId: solarSystemInfo.solarSystemID,
                constellationId: solarSystemInfo.constellationID,
                regionId: solarSystemInfo.regionID,
                solarSystemName: solarSystemInfo.solarSystemName,
                solarSystemNameLC: solarSystemInfo.solarSystemName.toLowerCase(),
                constellationName: constellationName,
                regionName: regionName,

                classTitle: classTitle,
                typeDescription: typeDescription,
                isShattered: isShattered,
                effectName: effectName,
                effectPower: effectPower,
                statics: statics,
                wanderers: wanderers,
                triglavianInvasionStatus: triglavianInvasionStatus,
            }));
        }

        await Promise.all(prarr);

        log(log.INFO, "passed");
    }

    async constellationName (constellationId) {
        let query = `SELECT "constellationName"
            FROM public."mapConstellations"
            WHERE "constellationID"='${constellationId}';`;

        let result = await this.staticDb.query(query);

        return result.rows[0].constellationName;
    }

    async regionName (regionId) {
        let query = `SELECT "regionName"
            FROM public."mapRegions"
            WHERE "regionID"='${regionId}';`;

        let result = await this.staticDb.query(query);

        return result.rows[0].regionName;
    }

    async systemClass (regionId, constellationId, solarSystemId) {
        let query = `Select Table1.*
                FROM
                  (Select CASE
                              when "locationID"='${regionId}' then 1
                              when "locationID"='${constellationId}' then 2
                              when "locationID"='${solarSystemId}' then 3
                          END as "Order",
                          "locationID",
                          "wormholeClassID"
                   From public."mapLocationWormholeClasses") AS Table1
                WHERE NOT Table1."Order" IS NULL
                Order by Table1."Order" DESC
                LIMIT 1`;

        let result = await this.staticDb.query(query);

        return result.rows.length !== 0 ? result.rows[0].wormholeClassID : -1;
    }
}

const reinstallCachedESD = async function (_client, _conString) {
    client = _client;
    conString = _conString;
    await (new buildSolarSystemTable()).build();
}

module.exports = reinstallCachedESD;