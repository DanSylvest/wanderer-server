/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/21/20.
 */

const Emitter = require('./../../env/_new/tools/emitter');
const log = require('./../../utils/log');
const DBController = require('./../dbController');
const Map = require('./map');
const md5 = require('md5');
const UserMapWatcher = require('./userMapWatcher.js');
const UserSubscriptions = require('./userSubscriptions.js');
const mapSqlActions = require('./sql/mapSqlActions.js');
const { getCorporationId, getAllianceId } = require('./../characters/utils');
const { getCorporationName, getAllianceName, getName } = require('../characters/utils');
const { saveMapUserActions } = require('./sql/mapSqlUserActions');

const USER_DROP_TIMEOUT = 10000;

class MapController extends Emitter{
  constructor () {
    super();

    /**
     *
     * @type {Object.<string, Map>}
     * @private
     */
    this._maps = Object.create(null);
    this._onlineUsers = Object.create(null);
    this._umw = new UserMapWatcher();
    this._us = new UserSubscriptions();
  }

  destructor () {
    super.destructor(this);
  }

  async init () {
    let allMaps = await this.getAllMaps();
    await Promise.all(allMaps.map(_map => this.get(_map.id).init()));
  }

  /**
   *
   * @param {string} _mapId
   * @returns {boolean}
   */
  has (_mapId) {
    return !!this._maps[_mapId];
  }

  /**
   *
   * @param {string} _mapId
   * @returns {Map}
   */
  get (_mapId) {
    if (!this.has(_mapId)) {
      this._add(_mapId, new Map({ mapId: _mapId }));
      this._maps[_mapId].init();
    }

    return this._maps[_mapId];
  }

  remove (_mapId) {
    if (this.has(_mapId)) {
      this._maps[_mapId].deinit();
      delete this._maps[_mapId];
    }
  }

  _add (_mapId, _mapInstance) {
    this._maps[_mapId] = _mapInstance;
  }

  async connectionBreak (_connectionId) {
    for (let mapId in this._maps) {
      this._maps[mapId].connectionBreak(_connectionId);
    }
  }

  async removeCharactersFromObserve (userId, mapId, characters) {
    if (this._maps[mapId]) {
      await this._maps[mapId].removeCharactersFromTracking(userId, characters);
    }
  }

  userOffline (userId) {
    this._onlineUsers[userId].tid = setTimeout(async function (userId) {
      this._onlineUsers[userId].tid = -1;
      this._onlineUsers[userId].online = false;

      this._umw.removeUser(userId);
      this._us.removeUser(userId);
      delete this._onlineUsers[userId];
      log(log.INFO, 'User [%s] now is offline.', userId);

      await core.userController.setOnline(userId, false);
    }.bind(this, userId), USER_DROP_TIMEOUT);
  }

  userOnline (_userId) {
    if (!this._onlineUsers[_userId]) {
      this._onlineUsers[_userId] = {
        online: true,
        tid: -1,
      };
    } else if (this._onlineUsers[_userId].tid !== -1) {
      clearTimeout(this._onlineUsers[_userId].tid);
      this._onlineUsers[_userId].tid = -1;
      this._onlineUsers[_userId].online = true;
      return;
    }
    log(log.INFO, 'User [%s] now is online.', _userId);
  }

  /**
   * This method will add character to tracking at maps or will remove
   * @param {string[]} maps
   * @param {string} characterId
   * @param {boolean }state
   * @return {Promise<void>}
   */
  async updateCharacterTrackStatus (maps, characterId, state) {
    const userId = await core.userController.getUserByCharacter(characterId);
    if (state) {
      for (let a = 0; a < maps.length; a++) {
        this.has(maps[a]) && this.get(maps[a]).addCharactersToObserve(userId, [characterId]);
      }
      return;
    }

    /**
     * Get all groups where character are tracking */
    const groups = await core.groupsController.getGroupsByTrackedCharacterId(characterId);

    //
    /**
     * Get all maps which contains current groups
     * Пример: [[111,222], [222,333]] */
    const mapsArr = await Promise.all(groups.map(x => core.groupsController.getMapsByGroup(x)));

    /**
     * Convert maps array into object for easy search and filter from duplicates
     * @type {Object.<string, boolean>}
     */
    const otherMaps = mapsArr.flat().convertToMap();
    const hasOtherMaps = Object.keys(otherMaps).length > 0;
    await Promise.all(maps.reduce((acc, mapId) => {
      if (this.has(mapId) && (!hasOtherMaps || !otherMaps[mapId])) {
        acc.push(this.get(mapId).removeCharactersFromTracking(userId, [characterId]));
      }

      return acc;
    }, []));
  }

  async getMapsByGroupsWithCharacters (_input) {
    let prarr = [];
    let infoGroups = [];
    for (let groupId in _input) {
      infoGroups.push({ groupId: groupId, characterIds: _input[groupId] });
      prarr.push(core.groupsController.getMapsByGroup(groupId));
    }

    // Получаем массив идентификаторов карт
    let arrMapIds = await Promise.all(prarr);

    // Разложим персонажей по картам
    let filteredMaps = Object.create(null);
    for (let a = 0; a < arrMapIds.length; a++) {
      let mapIds = arrMapIds[a];
      let groupInfo = infoGroups[a];

      for (let b = 0; b < mapIds.length; b++) {
        let mapId = mapIds[b];

        if (!filteredMaps[mapId]) {
          filteredMaps[mapId] = [];
        }
        filteredMaps[mapId].merge(groupInfo.characterIds);
      }
    }

    return filteredMaps;
  }

  async _updateGroups (_mapId, _groups) {
    let condition = [
      { name: 'type', operator: '=', value: DBController.linksTableTypes.mapToGroups },
      { name: 'first', operator: '=', value: _mapId },
    ];

    let result = await core.dbController.linksTable.getByCondition(condition, ['first', 'second']);

    let added = [], removed = [], transactionArr = [];
    for (let a = 0; a < _groups.length; a++) {
      if (result.searchByObjectKey('second', _groups[a]) === null) {
        transactionArr.push(core.dbController.linksTable.add({
          type: DBController.linksTableTypes.mapToGroups,
          first: _mapId,
          second: _groups[a],
        }, true));
        added.push(_groups[a]);
      }
    }

    for (let b = 0; b < result.length; b++) {
      if (_groups.indexOf(result[b].second) === -1) {
        transactionArr.push(core.dbController.linksTable.removeByCondition([
          { name: 'type', operator: '=', value: DBController.linksTableTypes.mapToGroups },
          { name: 'first', operator: '=', value: _mapId },
          { name: 'second', operator: '=', value: result[b].second },
        ], true));
        removed.push(result[b].second);
      }
    }

    await core.dbController.db.transaction(transactionArr);
    return { added: added, removed: removed };
  }

  async actualizeOfflineCharactersForMaps (maps, characters) {
    await Promise.all(characters.map(characterId => this.updateCharacterTrackStatus(maps, characterId, false)));
  }

  async actualizeOnlineCharactersForMaps (maps, characters) {
    await Promise.all(characters.map(characterId => this.updateCharacterTrackStatus(maps, characterId, false)));
  }

  async addChainManual (owner, mapId, sourceSolarSystemId, targetSolarSystemId) {
    let map = this.get(mapId);
    const added = await map.addChainManual(sourceSolarSystemId, targetSolarSystemId);
    await saveMapUserActions(owner, mapId, 'addChainManual', { sourceSolarSystemId, targetSolarSystemId, added });
  }

  /**
   *
   * @param _owner - is mapper user id
   * @param _data {{}}
   * @param _data.name {string}
   * @param _data.description {string}
   * @param _data.note {string}
   * @param _data.groups {Array<string>}
   * @returns {Promise<any> | Promise<unknown>}
   */
  async createMap (_owner, _data) {
    let id = md5(config.app.solt + '_' + +new Date);

    let props = {
      id: id,
      owner: _owner,
      name: _data.name,
      personalNote: _data.note,
      description: _data.description,
    };

    await core.dbController.mapsDB.add(props);
    await this._updateGroups(id, _data.groups);
    await this.notifyAllowedMapsByMap(id);

    return id;
  }

  /**
   *
   * @param _mapId
   * @param _props
   * @returns {Promise<void>}
   */
  async editMap (_mapId, { name, description, note, groups }) {
    // todo Тут наверно надо сделать очередь на редактирование.
    // нельзя что бы эдитилось сразу 2 карты...
    // хз надо об этом подумать

    if (groups) {
      let oldGroups = await this.getMapGroups(_mapId);
      let { added, removed } = await this._updateGroups(_mapId, groups);

      // персонажей надо добавлять в онлайн только при условии, что у карты были хотя бы
      // какие-то группы, т.к. если их не было, то смотреть на карту невозможно
      if (oldGroups.length !== 0) {
        if (added.length > 0) {
          let charsArr = await Promise.all(added.map(groupId => core.groupsController.getTrackedCharactersByGroup(groupId)));
          let characters = [];
          charsArr.map(x => characters.merge(x));
          await Promise.all(characters.map(characterId => this.updateCharacterTrackStatus([_mapId], characterId, true)));
        }

        if (removed.length > 0) {
          let charsArr = await Promise.all(removed.map(groupId => core.groupsController.getTrackedCharactersByGroup(groupId)));
          let characters = [];
          charsArr.map(x => characters.merge(x));
          await Promise.all(characters.map(characterId => this.updateCharacterTrackStatus([_mapId], characterId, false)));
        }
      }
    }

    await core.dbController.mapsDB.set(_mapId, { name, description, personalNote: note });

    await this.notifyAllowedMapsByMap(_mapId);
  }

  /**
   * А ведь это не так тривиально как кажется, да?
   *  - удалить все слинкоанные с картой группы
   *  - удалить сам объект карты (но это просто остановка работы механизма карты)
   *  - удалить из бд mapLinksTable все линки
   *  - удалить из бд mapSystemsTable все системы с их параметрами
   *  - удалить из бд mapSystemToCharacterTable связи персонажей с картой
   *  - оповестить всех кто смотрит на карту, что она была удалена
   * @param _mapId
   * @returns {Promise<unknown>}
   */
  async removeMap (_mapId) {
    await mapSqlActions.removeMap(_mapId);
    await mapSqlActions.unlinkMapGroups(_mapId);

    this._umw.removeMapFromAllUsers(_mapId);
    this.remove(_mapId);

    await this.notifyAllowedMapsByMap(_mapId);
  }

  /**
   * @param {string} userId
   * @param {Object} data
   * @param {String} data.mapName
   * @param {String} data.mapDescription
   * @param {String} data.mapNote
   * @param {String} data.groupName
   * @param {String} data.groupDescription
   * @param {Boolean} data.shareForCorporation
   * @param {Boolean} data.shareForAlliance
   * @param {Number} data.characterId
   * @returns {*}
   */
  async createMapFast (userId, { characterId, ...data }) {
    const {
      mapName,
      mapDescription,
      mapNote,
      groupName,
      groupDescription,
      shareForCorporation,
      shareForAlliance,
    } = data;

    const [corporationId, allianceId] = await Promise.all([
      ...(shareForCorporation ? [getCorporationId(characterId)] : []),
      ...(shareForAlliance ? [getAllianceId(characterId)] : []),
    ]);

    const [characterName, corporationName, allianceName] = await Promise.all([
      getName(characterId),
      ...(shareForCorporation ? [getCorporationName(corporationId)] : []),
      ...(shareForAlliance ? [getAllianceName(allianceId)] : []),
    ]);

    let newMapDescription;
    const currentTime = new Date().toUTCString();
    if (mapDescription === '') {
      newMapDescription = `This map was created in ${ currentTime }.`;
    } else {
      newMapDescription = mapDescription;
    }

    let newMapNote;
    if (mapNote === '') {
      newMapNote = `This map was created by ${ characterName }`;

      if (shareForCorporation || shareForAlliance) {
        newMapNote += ` for ${ [corporationName, allianceName].filter(x => !!x).join(', ') }.`;
      }
    } else {
      newMapNote = mapNote;
    }

    let newGroupDescription;
    if (groupDescription === '') {
      newGroupDescription = `This access list was created in ${ currentTime }.`;
    } else {
      newGroupDescription = groupDescription;
    }

    const groupOptions = {
      name: groupName || `group_${ mapName }`,
      description: newGroupDescription,
      characters: [characterId],
    };

    if (shareForCorporation) {
      groupOptions.corporations = [corporationId];
    }

    if (shareForAlliance) {
      groupOptions.alliances = [allianceId];
    }

    const lastCreatedGroupId = await core.groupsController.createGroup(userId, groupOptions);
    await core.groupsController.updateCharacterTrack(lastCreatedGroupId, characterId, true);

    const lastCreatedMapId = await this.createMap(userId, {
      name: mapName,
      description: newMapDescription,
      note: newMapNote,
      groups: [lastCreatedGroupId],
    });

    await this.notifyAllowedMapsByMap(lastCreatedMapId);

    return {
      mapId: lastCreatedMapId,
      groups: [lastCreatedGroupId],
      name: mapName,
      note: newMapNote,
      description: newMapDescription,
    };
  }

  async notifyAllowedMapsByAffectedCharacters (characters) {
    let usersOnCharacters = await core.userController.getUsersByCharacters(characters);
    let usersObj = Object.create(null);
    usersOnCharacters.map(x => usersObj[x.userId] = true);
    let users = Object.keys(usersObj);
    await Promise.all(users.map(userId => this.notifyAllowedMapsByUser(userId)));
  }

  async notifyAllowedMapsByUser (userId) {
    if (this._us.getUser(userId).allowedMaps.notify) {
      let lastUpdatedMaps = this._us.getUser(userId).allowedMaps.getData(); // было
      let allowedMaps = await this.getMapsWhereCharacterTrackByUser(userId); // стало

      let diff = lastUpdatedMaps.diff(allowedMaps);

      if (diff.added.length > 0) {
        diff.added.map(x => lastUpdatedMaps.push(x));
        this._us.getUser(userId).allowedMaps.subscription.notify({
          type: 'added',
          maps: diff.added,
        });
      }

      if (diff.removed.length > 0) {
        diff.removed.map(x => lastUpdatedMaps.removeByValue(x));
        this._us.getUser(userId).allowedMaps.subscription.notify({
          type: 'removed',
          maps: diff.removed,
        });
      }
    }
  }

  async notifyAllowedMapsByMap (mapId) {
    let users = this._us.getUsers();
    users = users.filter(userId => this._us.getUser(userId).allowedMaps.notify);

    let charsArr = await Promise.all(users.map(userId => this.getTrackingCharactersForMapByUser(mapId, userId)));

    users.map((userId, index) => {
      let hasTrackedCharacters = charsArr[index].length > 0;
      let lastUpdatedMaps = this._us.getUser(userId).allowedMaps.getData();
      let hasMap = lastUpdatedMaps.indexOf(mapId) !== -1;

      if (hasMap && !hasTrackedCharacters) {
        lastUpdatedMaps.removeByValue(mapId);
        this._us.getUser(userId).allowedMaps.subscription.notify({
          type: 'removed',
          maps: [mapId],
        });
      } else if (!hasMap && hasTrackedCharacters) {
        lastUpdatedMaps.push(mapId);
        this._us.getUser(userId).allowedMaps.subscription.notify({
          type: 'added',
          maps: [mapId],
        });
      }
    });
  }

  /**
   *
   * @param _ownerId
   * @return {Promise<{id: string, name: string, personalNote: string, description: string}[]>}
   */
  async getMapListByOwner (_ownerId) {
    let condition = [{ name: 'owner', operator: '=', value: _ownerId }];
    return await core.dbController.mapsDB.getByCondition(condition, ['id', 'name', 'personalNote', 'description']);
  }

  /**
   *
   * @param mapId
   * @return {Promise<{id: string, name: string, description: string, hubs: number[]}>}
   */
  async getMapInfo (mapId) {
    const attributes = ['id', 'name', 'description', 'personalNote', 'hubs', 'owner'];
    return await core.dbController.mapsDB.get(mapId, attributes);
  }

  async getMapGroups (mapId) {
    let condition = [
      { name: 'type', operator: '=', value: DBController.linksTableTypes.mapToGroups },
      { name: 'first', operator: '=', value: mapId },
    ];
    let result = await core.dbController.linksTable.getByCondition(condition, ['second']);
    return result.map(x => x.second);
  }

  async getAllMaps () {
    return await core.dbController.mapsDB.all();
  }

  async setMapWatchStatus (connectionId, userId, mapId, status) {
    // Если текущий статус слежения за картой, выставлен в тру.
    if (status) {
      // Если нет слежения по текущему конекшну то создадим новый
      this._umw.addConnection(userId, connectionId);

      // Для всех карт пройдемся и зададим значение в false
      let prarr = [];
      this._umw.eachMap(userId, connectionId, (_mapId, _isWatch) => {
        if (_isWatch) {
          this._umw.set(userId, connectionId, _mapId, false);

          // Пользователь может с разных вкладок смотреть на разные карты
          // При открытии второй вкладки, по умолчанию пользак видит ту же что и на первой
          // Потом он переключается, и вот конкретно для него, мы убираем статус отслеживания
          // Но этот же пользователь, может смотреть на карту и под другими конекшенами
          // поэтому мы проверяем, смотрит ли он еще на карту...
          if (!this._umw.isUserWatchOnMap(userId, _mapId)) {
            prarr.push(this.updateMapWatchStatus(userId, _mapId, false));
          }
        }
      });
      await Promise.all(prarr);

      this._umw.set(userId, connectionId, mapId, true);
      await this.updateMapWatchStatus(userId, mapId, true);
    } else if (this._umw.get(userId, connectionId, mapId)) {
      this._umw.set(userId, connectionId, mapId, false);

      if (!this._umw.isUserWatchOnMap(userId, mapId)) {
        await this.updateMapWatchStatus(userId, mapId, false);
      }
    }
  }

  async getTrackingCharactersForMapByUser (mapId, userId) {
    let groupsPr = this.getMapGroups(mapId);
    let userCharactersPr = core.userController.getUserCharacters(userId);
    let groups = await groupsPr;
    let userCharacters = await userCharactersPr;

    let cond = [];
    for (let a = 0; a < groups.length; a++) {
      for (let b = 0; b < userCharacters.length; b++) {
        cond.push([
          { name: 'characterId', operator: '=', value: userCharacters[b] },
          { name: 'groupId', operator: '=', value: groups[a] },
          { name: 'track', operator: '=', value: true },
        ]);
      }
    }

    let result = [];
    if (cond.length > 0) {
      let dbRes = await core.dbController.groupToCharacterTable.getByCondition({
        condition: cond,
        operator: 'OR',
      }, ['characterId', 'groupId', 'track']);
      result = dbRes.map(x => x.characterId);
    }

    return result;
  }

  async getMapsWhereCharacterTrackByUser (userId) {
    let characters = await core.userController.getUserCharacters(userId);
    let maps = [];

    if (characters.length > 0) {
      let condition = {
        operator: 'OR',
        condition: characters.map(characterId => ({
          operator: 'AND',
          left: { name: 'characterId', operator: '=', value: characterId },
          right: { name: 'track', operator: '=', value: true },
        })),
      };

      let dbRes = await core.dbController.groupToCharacterTable.getByCondition(condition, ['groupId']);
      let mapsArr = await Promise.all(dbRes.map(x => core.groupsController.getMapsByGroup(x.groupId)));
      mapsArr.map(x => maps.merge(x));
    }

    return maps;
  }

  async updateMapWatchStatus (userId, mapId, status) {
    let characters = await this.getTrackingCharactersForMapByUser(mapId, userId);

    let map = this.get(mapId);

    if (status) {
      map.addCharactersToObserve(userId, characters);
    } else {
      map.removeCharactersFromObserve(characters);
    }
  }

  async dropCharsFromMapsByUserAndConnection (userId, connectionId) {
    if (this._umw.hasUser(userId)) {
      let prarr = [];
      this._umw.eachMap(userId, connectionId, (mapId, isWatch) => {
        if (isWatch) {
          this._umw.set(userId, connectionId, mapId, false);
          if (!this._umw.isUserWatchOnMap(userId, mapId)) {
            prarr.push(this.updateMapWatchStatus(userId, mapId, false));
          }
        }
      });
      await Promise.all(prarr);
    }
  }

  async subscribeAllowedMaps (userId, connectionId, responseId) {
    let user = this._us.getUser(userId);
    let needBulk = !user.allowedMaps.notify;

    user.allowedMaps.subscribe(connectionId, responseId);

    if (needBulk) {
      let allowedMaps = await this.getMapsWhereCharacterTrackByUser(userId);
      user.allowedMaps.setData(allowedMaps);
    }

    this._us.getUser(userId).allowedMaps.subscription.notifyFor(connectionId, responseId, {
      type: 'add',
      maps: user.allowedMaps.getData(),
    });
  }

  async unsubscribeAllowedMaps (userId, connectionId, responseId) {
    let user = this._us.getUser(userId);
    user.allowedMaps.unsubscribe(connectionId, responseId);
    this._us.removeUser(userId);
  }

  async searchSolarSystems (match) {
    let matchLC = match.toLowerCase();

    matchLC = matchLC
      .replace(/^( *?)([a-z0-9])/igm, '$2') // remove spaces before
      .replace(/([a-z0-9])( *?)$/igm, '$1') // remove spaces after
      .replace(/\s+/img, ' ');               // remove more than one spaces between symbols

    let cond = { name: 'solarSystemNameLC', operator: 'LIKE', value: `%${ matchLC }%` };
    let result = await core.dbController.solarSystemsTable.getByCondition(cond, core.dbController.solarSystemsTable.attributes());

    let indexed = result.map(x => ({ index: x.solarSystemNameLC.indexOf(matchLC), data: x }));
    let sorted = indexed.sort((a, b) => a.index - b.index);

    return sorted.map(x => ({
      systemClass: x.data.systemClass,
      security: x.data.security,
      solarSystemId: x.data.solarSystemId,
      solarSystemName: x.data.solarSystemName,
      constellationName: x.data.constellationName,
      regionName: x.data.regionName,
      classTitle: x.data.classTitle,
      isShattered: x.data.isShattered,
    }));
  }
}

module.exports = MapController;