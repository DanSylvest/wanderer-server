const fs = require("fs");
const { Client } = require("pg");
const Path = require("../js/env/tools/path");
const ConfReader = require("../js/utils/configReader");
const log = require("../js/utils/log");
const exist = require("../js/env/tools/exist");
const DB = require("../js/utils/db");
const additionalSystems = require("./additionalSystems.json");
require("../js/env/tools/standardTypeExtend");

const config = new ConfReader("conf").build();
const CACHED_DB = config.db.names.cachedESD;
const EVE_STATIC_DATA_DB = config.db.names.eveSde;
const dirPath = Path.fromBackSlash(__dirname);
dirPath.pop();

let conString;
let client;

class buildSolarSystemTable {
  async build() {
    log(log.INFO, "Start building Cache database...");
    await this.init();
    await this.createTable();
    await this.pass();
    log(log.INFO, "Complete build cache db...");
  }

  async init() {
    await client.query(`DROP DATABASE IF EXISTS "${CACHED_DB}";`);
    await client.query(`CREATE DATABASE "${CACHED_DB}";`);

    this.cacheDb = new DB({
      isTruncatable: false,
      client: new Client(`${conString}/${CACHED_DB}`),
    });

    log(log.INFO, `${conString}/${CACHED_DB}`);
    log(log.INFO, `${conString}/${EVE_STATIC_DATA_DB}`);
    this.staticDb = new Client(`${conString}/${EVE_STATIC_DATA_DB}`);

    const path = dirPath["+"](["eveData", "json"]);
    this.wormholeClassesInfo = JSON.parse(
      fs.readFileSync(path["+"]("wormholeClassesInfo.json").toString(), "utf8"),
    );
    this.shatteredConstellations = JSON.parse(
      fs.readFileSync(
        path["+"]("shatteredConstellations.json").toString(),
        "utf8",
      ),
    );

    this.effects = JSON.parse(
      fs.readFileSync(path["+"]("effects.json").toString(), "utf8"),
    );
    this.wormholeClasses = JSON.parse(
      fs.readFileSync(path["+"]("wormholeClasses.json").toString(), "utf8"),
    );
    // this.wormholes = JSON.parse(fs.readFileSync(path["+"]("wormholes.json").toString(), "utf8"));
    this.wormholeSystems = JSON.parse(
      fs.readFileSync(path["+"]("wormholeSystems.json").toString(), "utf8"),
    );
    this.triglavianSystems = JSON.parse(
      fs.readFileSync(path["+"]("triglavianSystems.json").toString(), "utf8"),
    );

    this.staticDb.connect();
    await this.staticDb.query("SELECT NOW()");
    await this.cacheDb.init();
  }

  async createTable() {
    this.solarSystemsTable = this.cacheDb.createTable({
      enableLog: false,
      name: "solar_systems",
      idField: "id",
      properties: [
        { name: "systemClass", type: Number },
        { name: "security", type: String },
        { name: "solarSystemId", type: Number },
        { name: "constellationId", type: Number },
        { name: "regionId", type: Number },
        { name: "solarSystemName", type: String },
        { name: "constellationName", type: String },
        { name: "regionName", type: String },
        { name: "typeDescription", type: String },
        { name: "classTitle", type: String },
        { name: "isShattered", type: Boolean },
        { name: "effectName", type: String },
        { name: "effectPower", type: Number },
        { name: "statics", type: Array },
        { name: "wanderers", type: Array },
        { name: "solarSystemNameLC", type: String },
        { name: "triglavianInvasionStatus", type: String },
        { name: "sunTypeId", type: Number },
      ],
    });
    await this.solarSystemsTable.init();
  }

  async pass() {
    const result = await this.staticDb.query(`SELECT t."regionID"
     , t."constellationID"
     , t."solarSystemID"
     , t."solarSystemName"
     , t.security
     , t."factionID"
     , t."sunTypeID"
FROM public."mapSolarSystems" t
ORDER BY t."solarSystemID"`);

    log(log.INFO, `Elements count "${result.rows.length}"`);
    const prarr = [];
    const ids = new Set();

    for (let a = 0; a < result.rows.length; a++) {
      const solarSystemInfo = result.rows[a];
      const constellationName = await this.constellationName(
        solarSystemInfo.constellationID,
      );
      const regionName = await this.regionName(solarSystemInfo.regionID);
      const wormholeClassID = await this.systemClass(
        solarSystemInfo.regionID,
        solarSystemInfo.constellationID,
        solarSystemInfo.solarSystemID,
      );

      let { security } = solarSystemInfo;
      let effectPower = 0;

      security = solarSystemInfo.security;
      if (security === -0.99) security = -1.0;

      security = security.toFixed(1);

      const wormholeClass = this.wormholeClasses.searchByObjectKey(
        "wormholeClassID",
        wormholeClassID,
      );
      let classTitle = wormholeClass.shortName;
      switch (wormholeClassID) {
        case this.wormholeClassesInfo.names.hs:
        case this.wormholeClassesInfo.names.ls:
        case this.wormholeClassesInfo.names.ns:
          classTitle = security.toString();
          break;
      }

      const typeDescription = wormholeClass.title;
      const isShattered =
        !!this.shatteredConstellations[solarSystemInfo.constellationID];
      let effectName = "";
      let statics = [];
      let wanderers = [];

      const wormholeData = this.wormholeSystems.searchByObjectKey(
        "solarSystemID",
        solarSystemInfo.solarSystemID,
      );
      if (wormholeData) {
        effectPower = wormholeClass.effectPower;
        effectName = wormholeData.effectName;
        statics = wormholeData.statics;
        wanderers = wormholeData.wanderers;
      }

      const trigInfo = this.triglavianSystems.searchByObjectKey(
        "solarSystemID",
        solarSystemInfo.solarSystemID,
      );
      let triglavianInvasionStatus = "Normal";
      if (exist(trigInfo)) {
        triglavianInvasionStatus = trigInfo.invasionStatus;
        effectPower = trigInfo.effectPower;
        effectName = trigInfo.effectName;
      }

      prarr.push(
        this.solarSystemsTable.add({
          systemClass: wormholeClassID,
          security,
          solarSystemId: solarSystemInfo.solarSystemID,
          constellationId: solarSystemInfo.constellationID,
          regionId: solarSystemInfo.regionID,
          solarSystemName: solarSystemInfo.solarSystemName,
          solarSystemNameLC: solarSystemInfo.solarSystemName.toLowerCase(),
          constellationName,
          regionName,

          classTitle,
          typeDescription,
          isShattered,
          effectName,
          effectPower,
          statics,
          wanderers,
          triglavianInvasionStatus,
          sunTypeId: solarSystemInfo.sunTypeID,
        }),
      );

      ids.add(solarSystemInfo.solarSystemID);
    }

    log(log.INFO, "Manual add");
    additionalSystems.forEach((sys) => {
      if (ids.has(sys.solarSystemId)) {
        return;
      }

      prarr.push(
        this.solarSystemsTable.add({
          ...sys,
          security: sys.security.toFixed(1),
        }),
      );
    });
    log(log.INFO, "Manual added");

    await Promise.all(prarr);

    log(log.INFO, "passed");
  }

  async constellationName(constellationId) {
    const query = `SELECT "constellationName"
            FROM public."mapConstellations"
            WHERE "constellationID"='${constellationId}';`;

    const result = await this.staticDb.query(query);

    return result.rows[0].constellationName;
  }

  async regionName(regionId) {
    const query = `SELECT "regionName"
            FROM public."mapRegions"
            WHERE "regionID"='${regionId}';`;

    const result = await this.staticDb.query(query);

    return result.rows[0].regionName;
  }

  async systemClass(regionId, constellationId, solarSystemId) {
    if (solarSystemId === 30100000) {
      // Zarzakh
      return 10100;
    }

    const query = `Select Table1.*
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

    const result = await this.staticDb.query(query);

    return result.rows.length !== 0 ? result.rows[0].wormholeClassID : -1;
  }
}

const reinstallCachedESD = async function (_client, _conString) {
  client = _client;
  conString = _conString;
  await new buildSolarSystemTable().build();
};

module.exports = reinstallCachedESD;
