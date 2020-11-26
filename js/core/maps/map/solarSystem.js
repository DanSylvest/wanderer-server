/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 11/16/20.
 */

const Emitter       = require("./../../../env/tools/emitter");
const classCreator  = require("./../../../env/tools/class");
const CustomPromise = require("./../../../env/promise.js");
const extend        = require("./../../../env/tools/extend.js");
const exist         = require("./../../../env/tools/exist.js");

const MapSolarSystem = classCreator("MapCharacter", Emitter, {
    constructor(mapId, solarSystemId) {
        Emitter.prototype.constructor.call(this);

        this.mapId = mapId;
        this.solarSystemId = solarSystemId;
        this.onlineCharacters = [];
        this._loadPromise = new CustomPromise();
    },
    destructor() {
        this._loadPromise.cancel();
        this._loadPromise = new CustomPromise();
        this.onlineCharacters = [];
        Emitter.prototype.destructor.call(this);
    },
    async init() {

    },
    async isSystemExistsAndVisible () {
        let condition = [
            {name: "id", operator: "=", value: this.solarSystemId},
            {name: "mapId", operator: "=", value: this.mapId}
        ];

        let result = await core.dbController.mapSystemsTable.getByCondition(condition, ["visible"]);

        return {
            exists: result.length > 0,
            visible: result.length > 0 && result[0].visible
        }
    },
    loadPromise () {
        return this._loadPromise.native;
    },
    resolve () {
        this._loadPromise.resolve();
    },
    reject () {
        this._loadPromise.reject();
    },
    async create (name, position) {
        await core.dbController.mapSystemsTable.add({
            mapId: this.mapId,
            id: this.solarSystemId,
            name: name,
            position: position
        });
    },
    async update (visible, position) {
        let condition = [
            {name: "id", operator: "=", value: this.solarSystemId},
            {name: "mapId", operator: "=", value: this.mapId}
        ];

        let data = {
            visible: visible
        }
        if(position)
            data.position = position;

        await core.dbController.mapSystemsTable.setByCondition(condition, data);
    },
    async getInfo () {
        let condition = [
            {name: "id", operator: "=", value: this.solarSystemId},
            {name: "mapId", operator: "=", value: this.mapId}
        ]

        let info = await core.dbController.mapSystemsTable.getByCondition(condition, core.dbController.mapSystemsTable.attributes());

        // TODO may be it not better way
        // but now i will do so
        let solarSystemInfo = await core.sdeController.getSolarSystemInfo(this.solarSystemId);
        let constellationInfoPr = core.sdeController.getConstellationInfo(solarSystemInfo.constellationID);
        let regionInfoPr = core.sdeController.getRegionInfo(solarSystemInfo.regionID);
        let wormholeClassPr = core.sdeController.getSystemClass(solarSystemInfo.regionID, solarSystemInfo.constellationID, this.solarSystemId);
        let additionalSystemInfoPr = core.mdController.getCompiledInfo(this.solarSystemId);

        let constellationInfo = await constellationInfoPr;
        let regionInfo = await regionInfoPr;
        let wormholeClass = await wormholeClassPr;
        let additionalSystemInfo = await additionalSystemInfoPr;

        let systemTypeInfo = core.fdController.wormholeClassesInfo[wormholeClass];

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
            isShattered: !!core.fdController.wormholeClassesInfo[solarSystemInfo.constellationID]
        }

        if(exist(additionalSystemInfo) && exist(additionalSystemInfo.effect)) {
            let effectData = await core.mdController.getSolarSystemEffectInfo(additionalSystemInfo.effect, wormholeClass);

            systemData.effectType = core.fdController.effectNames[additionalSystemInfo.effect];
            systemData.effectName = additionalSystemInfo.effect;
            systemData.effectData = effectData;
        }

        if(exist(additionalSystemInfo) && exist(additionalSystemInfo.statics)) {
            systemData.statics = additionalSystemInfo.statics;
        }

        return extend(extend({}, info[0]), {
            systemClass: wormholeClass,
            security: solarSystemInfo.security,
            constellationName: constellationInfo.constellationName,
            regionName: regionInfo.regionName,
            systemType: systemTypeInfo.type,
            systemData: systemData,
            onlineCount: this.onlineCharacters.length,
            onlineCharacters: this.onlineCharacters
        });
    },
});

module.exports = MapSolarSystem;