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

        let mapInfo = await core.dbController.mapSystemsTable.getByCondition(condition, core.dbController.mapSystemsTable.attributes());
        let solarSystemInfo = await core.dbController.solarSystemsTable.getByCondition({
            name: "solarSystemId", operator: "=", value: this.solarSystemId
        }, core.dbController.solarSystemsTable.attributes());

        if(!solarSystemInfo[0])
            throw "exception";

        if(!mapInfo[0])
            throw "exception";

        solarSystemInfo = solarSystemInfo[0];
        mapInfo = mapInfo[0];

        let systemData = {
            typeName: solarSystemInfo.typeName,
            typeDescription: solarSystemInfo.typeDescription,
            isShattered: solarSystemInfo.isShattered,
        }

        if(solarSystemInfo.effectType)
            systemData.effectType = solarSystemInfo.effectType;

        if(solarSystemInfo.effectName)
            systemData.effectName = solarSystemInfo.effectName;

        if(solarSystemInfo.effectData)
            systemData.effectData = solarSystemInfo.effectData;

        if(solarSystemInfo.statics)
            systemData.statics = solarSystemInfo.statics;

        let out = {
            id: mapInfo.id,
            mapId: mapInfo.mapId,
            isLocked: mapInfo.isLocked,
            name: mapInfo.name,
            description: mapInfo.description,
            tag: mapInfo.tag,
            status: mapInfo.status,
            signatures: mapInfo.signatures,
            effects: mapInfo.effects,
            visible: mapInfo.visible,
            position: mapInfo.position,

            systemClass: solarSystemInfo.systemClass,
            security: solarSystemInfo.security,
            solarSystemId: solarSystemInfo.solarSystemId,
            constellationId: solarSystemInfo.constellationId,
            regionId: solarSystemInfo.regionId,
            solarSystemName: solarSystemInfo.solarSystemName,
            constellationName: solarSystemInfo.constellationName,
            regionName: solarSystemInfo.regionName,
            systemType: solarSystemInfo.systemType,
            systemData: systemData,

            onlineCount: this.onlineCharacters.length,
            onlineCharacters: this.onlineCharacters,
        }

        return out;
    }
});

module.exports = MapSolarSystem;