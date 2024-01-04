/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 11/16/20.
 */

const Emitter = require('./../../../env/_new/tools/emitter');
const CustomPromise = require('./../../../env/promise.js');
const exist = require('./../../../env/tools/exist.js');
const Subscriber = require('./../../../utils/subscriber');
const mapSqlActions = require('./../sql/mapSqlActions.js');
const { getSolarSystemInfo } = require('../sql/solarSystemSql');
const { ZkbDataProvider } = require('../../providers/zkbSystemProvider');

class MapSolarSystem extends Emitter{
  constructor (mapId, solarSystemId) {
    super();

    this.mapId = mapId;
    this.solarSystemId = solarSystemId;
    this.onlineCharacters = [];
    this._loadPromise = new CustomPromise();
    this._notifyDynamicInfoSubscriber = false;
    this.createZkbProvider();
  }

  destructor () {
    this._loadPromise.native.cancel();
    this._loadPromise = new CustomPromise();
    this.onlineCharacters = [];
    this.zkbProvider.destructor();
    delete this.zkbProvider;

    super.destructor();
  }

  createZkbProvider () {
    this.zkbProvider = new ZkbDataProvider(this.solarSystemId);
    this.zkbProvider.on('loaded', this.onZkbProviderLoaded.bind(this));
  }

  connectionBreak (_connectionId) {
    this._notifyDynamicInfoSubscriber && this._dynamicInfoSubscriber.removeSubscribersByConnection(_connectionId);
  }

  async isSystemExistsAndVisible () {
    let condition = [
      { name: 'id', operator: '=', value: this.solarSystemId },
      { name: 'mapId', operator: '=', value: this.mapId },
    ];

    let result = await core.dbController.mapSystemsTable.getByCondition(condition, ['visible']);

    return {
      exists: result.length > 0,
      visible: result.length > 0 && result[0].visible,
    };
  }

  loadPromise () {
    return this._loadPromise.native;
  }

  resolve () {
    this._loadPromise.resolve();
  }

  reject () {
    this._loadPromise.reject();
  }

  async create (name, position) {
    await core.dbController.mapSystemsTable.add({
      mapId: this.mapId,
      id: this.solarSystemId,
      name: name,
      position: position,
    });
  }

  onZkbProviderLoaded ({ kills, type }) {
    if (this._notifyDynamicInfoSubscriber) {
      this._dynamicInfoSubscriber.notify({
        type: 'systemUpdated',
        data: {
          killsCount: kills.length,
          activityState: type,
        },
      });
    }
  }

  async getInfo () {
    let condition = [
      { name: 'id', operator: '=', value: this.solarSystemId },
      { name: 'mapId', operator: '=', value: this.mapId },
    ];

    let mapInfo = await core.dbController.mapSystemsTable.getByCondition(condition, core.dbController.mapSystemsTable.attributes());
    let solarSystemInfo = await getSolarSystemInfo(this.solarSystemId);

    if (!solarSystemInfo) {
      throw 'exception';
    }

    if (!mapInfo[0]) {
      throw 'exception';
    }

    const zkbInfo = this.zkbProvider.info();

    solarSystemInfo = solarSystemInfo[0];
    mapInfo = mapInfo[0];

    let out = {
      id: mapInfo.id,
      mapId: mapInfo.mapId,
      isLocked: mapInfo.isLocked,
      name: mapInfo.name,
      description: mapInfo.description,
      tag: mapInfo.tag,
      status: mapInfo.status,
      signatures: mapInfo.signatures,
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

      effectName: solarSystemInfo.effectName,
      effectPower: solarSystemInfo.effectPower,
      statics: solarSystemInfo.statics || [],
      wanderers: solarSystemInfo.wanderers || [],
      classTitle: solarSystemInfo.classTitle,
      typeDescription: solarSystemInfo.typeDescription,
      isShattered: solarSystemInfo.isShattered,

      onlineCount: this.onlineCharacters.length,
      onlineCharacters: this.onlineCharacters,

      killsCount: zkbInfo.kills.length,
      activityState: zkbInfo.type,
    };

    return out;
  }

  async addCharacter (characterId) {
    await mapSqlActions.addCharacterToSystem(this.mapId, this.solarSystemId, characterId);
    this.onlineCharacters.push(characterId);

    if (this._notifyDynamicInfoSubscriber) {
      this._dynamicInfoSubscriber.notify({
        type: 'multipleEvents',
        list: [
          { type: 'onlineUpdate', data: { onlineCount: this.onlineCharacters.length } },
          { type: 'userJoin', data: { characterId } },
        ],
      });
    }
  }

  async removeCharacter (characterId) {
    await mapSqlActions.removeCharacterFromSystem(this.mapId, this.solarSystemId, characterId);
    this.onlineCharacters.removeByValue(characterId);

    if (this._notifyDynamicInfoSubscriber) {
      this._dynamicInfoSubscriber.notify({
        type: 'multipleEvents',
        list: [
          { type: 'onlineUpdate', data: { onlineCount: this.onlineCharacters.length } },
          { type: 'userLeave', data: { characterId } },
        ],
      });
    }
  }

  async updatePositions (x, y) {
    await mapSqlActions.updateSystemPosition(this.mapId, this.solarSystemId, x, y);

    if (this._notifyDynamicInfoSubscriber) {
      this._dynamicInfoSubscriber.notify({
        type: 'updatedSystemsPosition',
        data: { position: { x, y } },
      });
    }
  }

  async update (data) {
    await mapSqlActions.updateSystem(this.mapId, this.solarSystemId, data);

    if (this._notifyDynamicInfoSubscriber) {
      this._dynamicInfoSubscriber.notify({
        type: 'systemUpdated',
        data: data,
      });
    }
  }

  async changeVisible (visible) {
    await mapSqlActions.updateSystem(this.mapId, this.solarSystemId, { visible, ...(!visible && { tag: '' }) });
  }

  _createDynamicInfoSubscriber () {
    if (!this._dynamicInfoSubscriber) {
      this._dynamicInfoSubscriber = new Subscriber({
        responseCommand: 'responseEveMapSolarSystemData',
        onStart: function () {
          this._notifyDynamicInfoSubscriber = true;
          this.zkbProvider.start();
        }.bind(this),
        onStop: function () {
          this.zkbProvider.stop();
          this._notifyDynamicInfoSubscriber = false;
        }.bind(this),
      });
    }
  }

  subscribeDynamicInfo (connectionId, responseId) {
    this._createDynamicInfoSubscriber();
    this._dynamicInfoSubscriber.addSubscriber(connectionId, responseId);
    this._bulkDynamicInfo(connectionId, responseId);
  }

  unsubscribeDynamicInfo (_connectionId, _responseId) {
    if (this._dynamicInfoSubscriber) {
      this._dynamicInfoSubscriber.removeSubscriber(_connectionId, _responseId);
    }
  }

  async _bulkDynamicInfo (connectionId, responseId) {
    let info = await mapSqlActions.getSystemInfo(this.mapId, this.solarSystemId);

    if (info === null) {
      // debugger;
      return;
    }

    const zkbInfo = this.zkbProvider.info();

    this._dynamicInfoSubscriber.notifyFor(connectionId, responseId, {
      type: 'bulk',
      data: {
        isLocked: info.isLocked,
        name: info.name,
        userName: info.userName,
        description: info.description,
        tag: info.tag,
        status: info.status,
        signatures: info.signatures,
        position: info.position,
        onlineCount: this.onlineCharacters.length,
        onlineCharacters: this.onlineCharacters,
        killsCount: zkbInfo.kills.length,
        activityState: zkbInfo.type,
      },
    });
  }
}

module.exports = MapSolarSystem;