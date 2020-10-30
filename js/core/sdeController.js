var Emitter       = require("./../env/tools/emitter");
var classCreator  = require("./../env/tools/class");
var CustomPromise = require("./../env/promise");

var SdeController = classCreator("SdeController", Emitter, {
    constructor: function SdeController() {
        Emitter.prototype.constructor.call(this);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    getSolarSystemInfo: async function (_solarSystemId) {
        var pr = new CustomPromise();

        try {
            var query = `SELECT "regionID", "constellationID", "solarSystemID", "solarSystemName", security
            FROM public."mapSolarSystems"
            WHERE "solarSystemID"='` + _solarSystemId + `';`;

            var result = await core.dbController.sdeDB.custom(query);

            pr.resolve(result.rowCount > 0 ? result.rows[0] : null);

        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },
    getConstellationInfo: async function (_constellationId) {
        var pr = new CustomPromise();

        try {
            var query = `SELECT "constellationName"
            FROM public."mapConstellations"
            WHERE "constellationID"='` + _constellationId + `';`;

            var result = await core.dbController.sdeDB.custom(query);

            pr.resolve(result.rowCount > 0 ? result.rows[0] : null);

        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },
    getRegionInfo: async function (_regionId) {
        var pr = new CustomPromise();

        try {
            var query = `SELECT "regionName"
            FROM public."mapRegions"
            WHERE "regionID"='` + _regionId + `';`;

            var result = await core.dbController.sdeDB.custom(query);

            pr.resolve(result.rowCount > 0 ? result.rows[0] : null);

        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },
    getShipTypeInfo: async function (_shipTypeId) {
        let query = `SELECT "typeName", "volume"
            FROM public."invTypes"
            WHERE "typeID"='` + _shipTypeId + `';`;

        var result = await core.dbController.sdeDB.custom(query);
        return result.rowCount > 0 ? result.rows[0] : null;
    },
    /**
     *
     * SYSTEMS CLASSIFICATION
     *
     *  - 1 => C1
     *  - 2 => C2
     *  - 3 => C3
     *  - 4 => C4
     *  - 5 => C5
     *  - 6 => C6
     *  - 7 => hi-sec
     *  - 8 => low-sec
     *  - 9 => null-sec
     *  - 10 => constellation 20000062 - UUA-F4/0VFS-G
     *  - 11 => constellation 20000061 - UUA-F4/B-HLOG
     *  - 12 => Thera
     *  - 13 => Wolf-rayet frigate
     *  - 14 => drifters
     *  - 15 => drifters
     *  - 16 => drifters
     *  - 17 => drifters
     *  - 18 => drifters
     *  - 19 => abyss
     *  - 20 => abyss
     *  - 21 => abyss
     *  - 22 => abyss
     *  - 23 => abyss
     *  - 24 => penalty
     *
     * @param _regionId
     * @param _constellationId
     * @param _systemId
     * @returns {Promise<unknown>}
     */
    getSystemClass: async function (_regionId, _constellationId, _systemId) {
        var pr = new CustomPromise();

        try {
            var query = `Select Table1.*
                FROM
                  (Select CASE
                              when "locationID"='${_regionId}' then 1
                              when "locationID"='${_constellationId}' then 2
                              when "locationID"='${_systemId}' then 3
                          END as "Order",
                          "locationID",
                          "wormholeClassID"
                   From public."mapLocationWormholeClasses") AS Table1
                WHERE NOT Table1."Order" IS NULL
                Order by Table1."Order" DESC
                LIMIT 1`;

            var result = await core.dbController.sdeDB.custom(query);

            pr.resolve(result.rowCount > 0 ? result.rows[0].wormholeClassID : null);

        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },

    checkSystemJump: async function (_beforeSystemId, _currentSystemId) {
        var pr = new CustomPromise();

        try {
            var query = `SELECT t."fromRegionID"
                , t."fromConstellationID"
                , t."fromSolarSystemID"
                , t."toSolarSystemID"
                , t."toConstellationID"
                , t."toRegionID"
            FROM public."mapSolarSystemJumps" t
            WHERE "fromSolarSystemID"='${_beforeSystemId}' and "toSolarSystemID"='${_currentSystemId}' or "toSolarSystemID"='${_beforeSystemId}' and "fromSolarSystemID"='${_currentSystemId}'
            ORDER BY t."fromSolarSystemID"
                , t."toSolarSystemID"`;

            var result = await core.dbController.sdeDB.custom(query);

            pr.resolve(result.rowCount > 0);

        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;


    }
});

module.exports = SdeController;