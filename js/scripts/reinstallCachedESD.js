const Path        = require('./../env/tools/path');
const fs          = require('fs');
const ConfReader  = require("./../utils/configReader");
const log         = require("./../utils/log.js");
const Client      = require('pg').Client;
const exist       = require("./../env/tools/exist");
const DB          = require("./../utils/db");
require("./../env/tools/standardTypeExtend");

const config = new ConfReader("conf").build();
const CACHED_DB = config.db.names.cachedESD;
const EVE_STATIC_DATA_DB = config.db.names.eveSde;
const EVE_MANUAL_DB_NAME = config.db.names.eveManual;
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
        log(log.INFO, `${conString}/${EVE_MANUAL_DB_NAME}`);
        this.staticDb = new Client(`${conString}/${EVE_STATIC_DATA_DB}`);
        this.manualDb = new Client(`${conString}/${EVE_MANUAL_DB_NAME}`);


        let path =  dirPath["+"](["db", "json"]);
        this.wormholeClassesInfo = JSON.parse(fs.readFileSync(path["+"]("wormholeClassesInfo.json").toString(), "utf8"));
        this.effectNames = JSON.parse(fs.readFileSync(path["+"]("effectNames.json").toString(), "utf8"));
        this.shatteredConstellations = JSON.parse(fs.readFileSync(path["+"]("shatteredConstellations.json").toString(), "utf8"));
        this.triglavianInvasion = JSON.parse(fs.readFileSync(path["+"]("triglavianInvasion.json").toString(), "utf8"));

        this.staticDb.connect();
        this.manualDb.connect();
        await this.staticDb.query('SELECT NOW()');
        await this.manualDb.query('SELECT NOW()');
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
                {name: "systemType",               type: Number},
                {name: "typeDescription",          type: String},
                {name: "typeName",                 type: String},
                {name: "isShattered",              type: Boolean},
                {name: "effectType",               type: String},
                {name: "effectName",               type: String},
                {name: "effectData",               type: Array},
                {name: "statics",                  type: Array},
                {name: "solarSystemNameLC",        type: String},
                {name: "triglavianInvasionStatus", type: String},
                {name: "factionName",              type: String},
            ]
        });
        await this.solarSystemsTable.init();
    }

    async pass () {
        /**
         *  {
          "regionID": 10000004,
          "constellationID": 20000057,
          "solarSystemID": 30000401,
          "solarSystemName": "N-9EOQ",
          "security": -0.00003139919730310581,
          factionID:
       },
         */
            // try {
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
            let wormholeSystemClass = await this.systemClass(solarSystemInfo.regionID, solarSystemInfo.constellationID, solarSystemInfo.solarSystemID);
            let additionalSystemInfo = await this.getCompiledInfo(solarSystemInfo.solarSystemID);

            let factionName = "";
            if(exist(solarSystemInfo.factionID))
                factionName = await this.factionName(solarSystemInfo.factionID);

            let systemTypeInfo = this.wormholeClassesInfo[wormholeSystemClass];

            if(solarSystemInfo.security === -0.99)
                solarSystemInfo.security = -1.0;

            solarSystemInfo.security = solarSystemInfo.security.toFixed(1);

            let typeName = systemTypeInfo.shortName;
            switch (systemTypeInfo.type) {
                case 0:
                case 1:
                case 2:
                    typeName = solarSystemInfo.security.toString();
                    break;
            }

            let systemData = {
                typeName: typeName,
                typeDescription: systemTypeInfo.fullName,
                isShattered: !!this.shatteredConstellations[solarSystemInfo.constellationID]
            }

            if(exist(additionalSystemInfo) && exist(additionalSystemInfo.effect)) {
                let effectData = await this.getSolarSystemEffectInfo(additionalSystemInfo.effect, wormholeSystemClass);

                systemData.effectType = this.effectNames[additionalSystemInfo.effect];
                systemData.effectName = additionalSystemInfo.effect;
                systemData.effectData = effectData;
            }

            if(exist(additionalSystemInfo) && exist(additionalSystemInfo.statics)) {
                systemData.statics = additionalSystemInfo.statics;
            }

            let trigInfo = this.triglavianInvasion.searchByObjectKey("solarSystemName", solarSystemInfo.solarSystemName);
            let trigStatus = "Normal";
            if(exist(trigInfo)) {
                switch (trigInfo.invasionStatus) {
                    case "Final":
                        constellationName = trigInfo.constellationName;
                        regionName = trigInfo.regionName;
                        break;
                    case "Edencom":
                    case "Triglavian":
                        break;
                }

                trigStatus = trigInfo.invasionStatus;

                if(factionName !== "" && trigStatus !== "Normal") {
                    let effectInfo = this.getEffectByFaction(factionName, trigInfo.invasionStatus === "Edencom")
                    systemData.effectType = effectInfo.effectType;
                    systemData.effectName = effectInfo.effectName;
                    systemData.effectData = effectInfo.effectData;
                }
            }

            prarr.push(this.solarSystemsTable.add({
                systemClass: wormholeSystemClass,
                security: solarSystemInfo.security,
                solarSystemId: solarSystemInfo.solarSystemID,
                constellationId: solarSystemInfo.constellationID,
                regionId: solarSystemInfo.regionID,
                solarSystemName: solarSystemInfo.solarSystemName,
                solarSystemNameLC: solarSystemInfo.solarSystemName.toLowerCase(),
                constellationName: constellationName,
                regionName: regionName,
                systemType: systemTypeInfo.type,

                typeName: systemData.typeName,
                typeDescription: systemData.typeDescription,
                isShattered: systemData.isShattered,
                effectType: systemData.effectType,
                effectName: systemData.effectName,
                effectData: systemData.effectData,
                statics: systemData.statics,
                triglavianInvasionStatus: trigStatus,
                factionName: factionName,
            }));
        }

        await Promise.all(prarr);

        log(log.INFO, "passed");
    }

    async factionName (factionId) {
        let query = `SELECT "factionName"
            FROM public."chrFactions"
            WHERE "factionID"='${factionId}';`;

        let result = await this.staticDb.query(query);

        return result.rows[0].factionName;
    }

    getEffectByFaction (faction, isEdencom) {
        let effectType, effectName, effectData;

        if (isEdencom) {
            switch (faction) {
                case "Ammatar Mandate":
                case "Amarr Empire":
                case "Khanid Kingdom":
                    effectType = "imperialStellarObservatory";
                    effectName = "Imperial Stellar Observatory";
                    effectData = [
                        {description: "10% bonus to armor capacity", positive: true},
                        {description: "10% bonus to energy warfare capacitor drain", positive: true},
                        {description: "10% bonus to mining speed", positive: true},
                    ]
                    break;
                case "Caldari State":
                    effectType = "stateStellarObservatory";
                    effectName = "State Stellar Observatory";
                    effectData = [
                        {description: "10% bonus to shield capacity", positive: true},
                        {description: "10% bonus to ECM range", positive: true},
                        {description: "10% bonus to mining speed", positive: true},
                    ]
                    break;
                case "Minmatar Republic":
                    effectType = "republicStellarObservatory";
                    effectName = "Republic Stellar Observatory";
                    effectData = [
                        {description: "10% bonus to shield capacity", positive: true},
                        {description: "10% bonus to stasis webifier strength", positive: true},
                        {description: "10% bonus to mining speed", positive: true},
                    ]
                    break;
                case "Gallente Federation":
                    effectType = "federalStellarObservatory";
                    effectName = "Federal Stellar Observatory";
                    effectData = [
                        {description: "10% bonus to armor capacity", positive: true},
                        {description: "+1 bonus to warp scramble strength", positive: true},
                        {description: "10% bonus to mining speed", positive: true},
                    ]
                    break;
            }
        } else {
            effectType = "dazhLiminalityLocus";
            effectName = "Dazh Liminality Locus";
            effectData = [
                {description: "25% bonus to remote armor repair", positive: true},
                {description: "25% bonus to remote shield boost", positive: true},
                {description: "30% penalty to warp speed", positive: false},
                {description: "50% penalty to maximum locked targets", positive: false},
            ]
        }

        return {effectType: effectType, effectName: effectName, effectData: effectData}
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

    async getAdditionalSystemInfo (solarSystemId) {
        let query = `SELECT t.solarsystemid ,
                   t.system ,
                   t.class ,
                   t.star ,
                   t.planets ,
                   t.moons ,
                   t.effect ,
                   t.statics
            FROM public.wormholesystems_new t
            WHERE solarsystemid='${solarSystemId}'
            ORDER BY t.solarsystemid`;


        let result = await this.manualDb.query(query);

        return result.rows[0];
    }

    async getCompiledInfo (solarSystemId) {
        var info = await this.getAdditionalSystemInfo(solarSystemId);

        if(info && (info.statics === null || info.statics === ""))
            info.statics = [];

        if(info && info.statics && info.statics.length > 0) {
            var staticArr = info.statics.split(",");
            var arrResults = await Promise.all(staticArr.map(_hole => this.getWormholeClassInfo(_hole)));
            info.statics = arrResults.map(function(_info, _index) {
                return {
                    id: staticArr[_index],
                    type: this.wormholeClassesInfo[_info.in_class].shortName,
                    fullName: this.wormholeClassesInfo[_info.in_class].fullName,
                    class: _info.in_class
                };
            }.bind(this));
        }

        return info;
    }

    async getWormholeClassInfo (_wormholeClass) {
        let query = `SELECT t.id
                 , t.hole
                 , t.in_class
                 , t.maxstabletime
                 , t.maxstablemass
                 , t.massregeneration
                 , t.maxjumpmass
            FROM public.wormholeclassifications t
            WHERE hole='${_wormholeClass}'
            ORDER BY t.id`;

        let result = await this.manualDb.query(query);

        if(result.rows.length === 0)
            throw "error"

        return result.rows[0];
    }

    async getSolarSystemEffectInfo (_effectName, _wormholeClass) {
        switch (_wormholeClass) {
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
                _wormholeClass = 2;
                break;
        }

        let query = `SELECT t.id
             , t.positive
             , t.id_type
             , t.hole
             , t.effect
             , t.icon
             , t.c1
             , t.c2
             , t.c3
             , t.c4
             , t.c5
             , t.c6
        FROM public.effects_new t
        WHERE t.hole='${_effectName}'
        ORDER BY t.id`;

        var result = await this.manualDb.query(query);

        let out = [];
        for (var a = 0; a < result.rows.length; a++) {
            let rowData = result.rows[a];

            let effectName = rowData.effect;
            let effectStrength;
            switch (_wormholeClass) {
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    effectStrength = rowData["c" + _wormholeClass];
                    break;
            }

            if(effectStrength[0] !== "-")
                effectStrength = "+" + effectStrength;

            out.push({description: `${effectName}: ${effectStrength}`, positive: rowData.positive});
        }

        return out;
    }
}

const reinstallCachedESD = async function (_client, _conString) {
    client = _client;
    conString = _conString;
    await (new buildSolarSystemTable()).build();
}

module.exports = reinstallCachedESD;