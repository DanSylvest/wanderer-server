const Emitter = require("../env/tools/emitter");
const classCreator = require("../env/tools/class");
const CustomPromise = require("../env/promise");
const counterLog = require("../utils/counterLog");

const SdeController = classCreator("SdeController", Emitter, {
  constructor: function SdeController() {
    Emitter.prototype.constructor.call(this);
  },
  destructor() {
    Emitter.prototype.destructor.call(this);
  },
  // TODO - Всё это можно пересчитать один раз на установке, и не делать запрос на получение группы шипа
  // Так же можно будет запросить катеогрию и что-нибудь еще - и сложить это всё в одну таблицу.
  async getShipTypeInfo(_shipTypeId) {
    let query = `SELECT "typeName", "volume", "description", "mass", "capacity", "groupID", "typeID"
            FROM public."invTypes"
            WHERE "typeID"='${_shipTypeId}';`;

    counterLog("SQL", query);
    const result = await core.dbController.sdeDB.custom(query);
    if (result.rowCount > 0) {
      query = `SELECT "groupName"
            FROM public."invGroups"
            WHERE "groupID"='${result.rows[0].groupID}';`;
      counterLog("SQL", query);
      const groupResult = await core.dbController.sdeDB.custom(query);

      const out = { ...result.rows[0], ...groupResult.rows[0] };
      delete out.groupID;
      return out;
    }

    return null;
  },
  async checkSystemJump(_beforeSystemId, _currentSystemId) {
    const pr = new CustomPromise();

    try {
      const query = `SELECT t."fromRegionID"
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
      const result = await core.dbController.sdeDB.custom(query);

      pr.resolve(result.rowCount > 0);
    } catch (_err) {
      pr.reject(_err);
    }

    return pr.native;
  },
});

module.exports = SdeController;
