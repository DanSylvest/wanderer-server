var Emitter       = require("./../env/tools/emitter");
var classCreator  = require("./../env/tools/class");
var CustomPromise = require("./../env/promise");
const counterLog  = require("./../utils/counterLog");

var SdeController = classCreator("SdeController", Emitter, {
    constructor: function SdeController() {
        Emitter.prototype.constructor.call(this);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    //TODO - Всё это можно пересчитать один раз на установке, и не делать запрос на получение группы шипа
    // Так же можно будет запросить катеогрию и что-нибудь еще - и сложить это всё в одну таблицу.
    async getShipTypeInfo (_shipTypeId) {
        let query = `SELECT "typeName", "volume", "description", "mass", "capacity", "groupID", "typeID"
            FROM public."invTypes"
            WHERE "typeID"='${_shipTypeId}';`;

        counterLog("SQL", query);
        let result = await core.dbController.sdeDB.custom(query);
        if(result.rowCount > 0) {
            query = `SELECT "groupName"
            FROM public."invGroups"
            WHERE "groupID"='${result.rows[0].groupID}';`;
            counterLog("SQL", query);
            let groupResult = await core.dbController.sdeDB.custom(query);

            let out = {...result.rows[0], ...groupResult.rows[0]};
            delete out.groupID;
            return out;
        }

        return null;
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

            counterLog("SQL", query);
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