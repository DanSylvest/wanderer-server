/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/22/20.
 */

const Emitter = require('./../../env/_new/tools/emitter');
const exist = require('./../../env/tools/exist');
const CustomPromise = require('./../../env/promise');
const Character = require('./map/character');
const User = require('./map/user');
const MapSolarSystem = require('./map/solarSystem.js');
const mapSqlActions = require('./sql/mapSqlActions.js');
const solarSystemSql = require('./sql/solarSystemSql.js');
const ChainsManager = require('./map/chainsManager.js');
const log = require('./../../utils/log.js');
const MapSubscribers = require('./map/mapSubscribers.js');
const MapChain = require('./map/chain.js');
const CollectCharactersForBulk = require('./map/mixins/collectCharactersForBulk.js');
const { prohibitedSystemClasses, prohibitedSystems } = require('./../helpers/environment');
const { getSolarSystemInfo } = require('./sql/solarSystemSql');
const { getSystemInfo } = require('./sql/mapSqlActions');
const { ZkbSystemsProvider } = require('./../providers/zkbSystemsProvider');

const SYSTEM_LIFETIME_LIMIT_CHECK_TIMEOUT = 1000 * 60;
const SYSTEM_LIFETIME_LIMIT_MS = 1000 * 60 * 5
// const SYSTEM_LIFETIME_LIMIT_CHECK_TIMEOUT = 1000 * 5;
// const SYSTEM_LIFETIME_LIMIT_MS = 1000 * 30

class Map extends Emitter{
  constructor (_options) {
    super();
    this.options = Object.create(null);

    // let __mapId = null;
    // Object.defineProperty(this.options, 'mapId', {
    //   get: function () {
    //     return __mapId;
    //   },
    //   set: function (_val) {
    //     if (_val === undefined) {
    //       debugger;
    //     }
    //
    //     __mapId = _val;
    //   },
    // });

    this.options.mapId = _options.mapId;

    /**
     *
     * @type {Object.<string, Character>}
     */
    this.characters = Object.create(null);

    /**
     *
     * @type {Object.<string, MapSolarSystem>}
     * @private
     */
    this._systems = Object.create(null);
    this._charactersOnSystem = Object.create(null);
    this._chains = Object.create(null);

    /**
     *
     * @type {Object.<string, User>}
     * @private
     */
    this._users = Object.create(null);
    this._charactersOnUsers = Object.create(null);

    this.subscribers = new MapSubscribers(this);

    /**
     *
     * @type {Object.<string, CustomPromise>}
     * @private
     */
    this._addingSystems = Object.create(null);

    this._timeoutId = null;

    this._createChainsManager();
    this._createZkbSystemsProvider();
  }

  destructor () {
    this.zkbSystemsProvider.destructor();
    this.chainsManager.destructor();
    this.subscribers.destructor();

    super.destructor();
  }

  async init () {
    this.chainsManager.start();
    this.zkbSystemsProvider.start();
    this._startClearTimeout();
  }

  deinit () {
    for (let systemId in this._systems) {
      this._systems[systemId].destructor();
    }

    for (let key in this._chains) {
      this._chains[key].promise.cancel();
    }

    for (let characterId in this.characters) {
      this.characters[characterId].destructor();
    }

    this.zkbSystemsProvider.stop();

    this.options = Object.create(null);
    this.characters = Object.create(null);
    this._systems = Object.create(null);
    this._charactersOnSystem = Object.create(null);
    this._chains = Object.create(null);

    if(this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  connectionBreak (_connectionId) {
    this.subscribers.connectionBreak(_connectionId);

    for (let solarSystemId in this._systems)
      this._systems[solarSystemId].connectionBreak(_connectionId);

    for (let chainId in this._chains)
      this._chains[chainId].model.connectionBreak(_connectionId);
  }

  _startClearTimeout() {
    this._timeoutId = setTimeout(this._tick.bind(this), SYSTEM_LIFETIME_LIMIT_CHECK_TIMEOUT);
  }

  async _tick() {
    this._timeoutId = null;

    let links = await mapSqlActions.getLinksWithData(
      this.options.mapId,
      ["timeStatus", "created", "updated", "solarSystemSource", "solarSystemTarget"]
    );
    let systems = await mapSqlActions.getSystemsInfo(this.options.mapId);

    const counted = systems
      .map(x => x.id)
      .reduce((acc, sys) => ({
        ...acc,
        [sys]: (acc[sys] || 0) + (links.filter(x => x.solarSystemSource === sys || x.solarSystemTarget === sys)?.length || 0)
      }), {})

    const currentTime = +new Date

    let needToRemove = systems
      .filter(x => counted[x.id] === 0)
      .filter(x => !x.isLocked)
      .filter(x => (currentTime - +new Date(x.updatedTime)) > SYSTEM_LIFETIME_LIMIT_MS )
      .map(x => x.id)


    if (needToRemove.length > 0) {
      const res = await mapSqlActions.countOnlineCharactersByLocations(needToRemove)

      needToRemove = needToRemove
        .filter(sys => parseInt(res.find(x => x.location === sys)?.character_count ?? '0') === 0)
    }

    await Promise.all(needToRemove.map(x => this.systemRemove(x)))

    this._startClearTimeout();
  }

  getSolarSystem (solarSystemId) {
    this._createSystemObject(solarSystemId);
    return this._systems[solarSystemId];
  }

  hasSolarSystem (systemId) {
    return exist(this._systems[systemId]);
  }

  async getChain (chainId) {
    if (!this._chains[chainId]) {
      let chainInfo = await mapSqlActions.getLinkInfo(this.options.mapId, chainId);
      if (!chainInfo) {
        throw `Error "Chain ${ chainId } isn't exists."`;
      }

      this._chains[chainId] = {
        model: new MapChain(this.options.mapId, chainId),
        promise: new CustomPromise(),
      };
      this._chains[chainId].promise.resolve();
    }

    return this._chains[chainId].model;
  }

  /**
   *
   * @param {string} userId
   * @param {string[]} characters
   */
  addCharactersToObserve (userId, characters) {
    characters.forEach(this._startObserverCharacter.bind(this, userId));
  }

  removeCharactersFromObserve (characterIds) {
    characterIds.forEach(this._stopObserverCharacter.bind(this));
  }

  async removeCharactersFromTracking (userId, charIds) {
    await Promise.all(charIds.map(this.removeCharacterFromTracking.bind(this, userId)));
  }

  _createChainsManager () {
    this.chainsManager = new ChainsManager(this.options.mapId);
    this.chainsManager.on('changedChains', this._onChainsChanged.bind(this));
  }

  _createZkbSystemsProvider () {
    this.zkbSystemsProvider = new ZkbSystemsProvider(this.options.mapId, []);
    this.zkbSystemsProvider.on('loaded', this.onZkbInfoLoaded.bind(this));
  }

  _createSystemObject (_systemId) {
    if (!exist(this._systems[_systemId])) {
      this._systems[_systemId] = new MapSolarSystem(this.options.mapId, _systemId);
      this.zkbSystemsProvider.addSystem(_systemId);
    }
  }

  _startObserverCharacter (userId, charId) {
    const hasCharacter = this.characters[charId];
    if (!hasCharacter) {
      this.characters[charId] = new Character(charId);
      this.characters[charId].on('onlineChanged', this._onCharacterOnlineChanged.bind(this, charId));
      this.characters[charId].on('leaveSystem', this._onCharacterLeaveSystem.bind(this, charId));
      this.characters[charId].on('enterInSystem', this._onCharacterEnterInSystem.bind(this, charId));
      this.characters[charId].on('moveToSystem', this._onCharacterMoveToSystem.bind(this, charId));
      this.characters[charId].on('shipChanged', this._onCharacterShipChanged.bind(this, charId));
      this.characters[charId].on('drop', this._onCharacterDrop.bind(this, charId));
      this.characters[charId].init();
    } else {
      this.characters[charId].cancelDropTimer();
    }

    if (this._users[userId]) {
      if (!this._charactersOnUsers[charId]) {
        this._charactersOnUsers[charId] = userId;
      }

      this._users[userId].addedToAvailable({
        charId,
        online: this.characters[charId].isOnline(),
      });
    }

    log(log.WARN, `STARTED observe [${ this.options.mapId }:${ charId }]`);
  }

  _stopObserverCharacter (charId) {
    log(log.WARN, `STOPPED observe [${ this.options.mapId }:${ charId }]`);

    this.characters[charId] && this.characters[charId].startDropTimer();
  }

  async onZkbInfoLoaded (data) {
    data.forEach(({ systemId, ...data }) => {
      if (!this._systems[systemId]) {
        return;
      }
      this._systems[systemId].updateZkbKills(data);
    });
  }

  async _onCharacterDrop (characterId) {
    await this.dropCharacter(characterId);

    // this is fast access to user characters
    let userId = this._charactersOnUsers[characterId];
    if (userId) {
      this._users[userId].removedFromAvailable(characterId);
      delete this._charactersOnUsers[characterId];
    }
  }

  async dropCharacter (charId) {
    if (!this.characters[charId]) {
      return;
    }

    let isOnline = this.characters[charId].isOnline();
    this.characters[charId].destructor();
    delete this.characters[charId];
    let currentSystemId = this._charactersOnSystem[charId];
    if (isOnline && currentSystemId) {
      await this._characterLeaveSystem(charId, currentSystemId);
      delete this._charactersOnSystem[charId];
      this.subscribers.notifyCharacterOnlineRemoved(charId);
    }
  }

  /**
   * this is a similar function as _onCharacterDrop
   * but this case work when you want immediately remove character without a delay
   *
   * It need at least for two cases:
   *  - if someone set off tracking for character
   *  - if someone removed character from account
   * @param {string} userId
   * @param {string} characterId
   * @return {Promise<void>}
   */
  async removeCharacterFromTracking (userId, characterId) {
    await this.dropCharacter(characterId);

    if (this._users[userId]) {
      this._users[userId].removedFromAvailable(characterId);
      delete this._charactersOnUsers[characterId];
    }
  }

  _onChainsChanged (chains) {
    chains.map(chain => {
      switch (chain.newState) {
        case 'EOL':
          this.updateLink(chain.id, { timeStatus: 1 });
          break;
        case 'Expired':
          this.linkRemove(chain.id);
          break;
      }
    });
  }

  async _onCharacterOnlineChanged (characterId, isOnline) {
    if (!isOnline) {
      this.subscribers.notifyCharacterOnlineRemoved(characterId);
    }

    // this is fast access to user characters
    let userId = this._charactersOnUsers[characterId];
    if (exist(userId)) {
      this._users[userId].onlineChanged(characterId, isOnline);
    }
  }

  async _onCharacterLeaveSystem (characterId) {
    await this._characterLeaveSystem(characterId, this._charactersOnSystem[characterId]);
    this.subscribers.notifyCharacterOnlineRemoved(characterId);
  }

  async _onCharacterEnterInSystem (characterId, location) {
    await this._characterEnterToSystem(characterId, location);
    this.subscribers.notifyCharacterOnlineAdded(characterId);
  }

  async _onCharacterMoveToSystem (characterId, oldSystem, location) {
    await this._characterMoveToSystem(characterId, oldSystem, location);
    this.subscribers.notifyCharacterOnlineUpdatedLocation(characterId, oldSystem, location);
  }

  _onCharacterShipChanged (characterId, shipId) {
    this.subscribers.notifyCharacterOnlineUpdatedShipType(characterId, shipId);
  }

  async _notifySystemAdd (_systemId) {
    this.subscribers.notifySystemAdd(_systemId);
  }

  /**
   *
   * @param _oldSystem
   * @param solarSystemId
   * @param position
   * @return {Promise<undefined>}
   * @private
   */
  async _addSystem (_oldSystem, solarSystemId, position) {
    let pos = position;
    this._createSystemObject(solarSystemId);
    let solarSystem = this._systems[solarSystemId];

    let isNeedResolveAddingPromise = false;
    if (!this._addingSystems[solarSystemId]) {
      this._addingSystems[solarSystemId] = new CustomPromise();
      isNeedResolveAddingPromise = true;
    } else {
      await this._addingSystems[solarSystemId].native;
    }

    let result = await mapSqlActions.isSystemExistsAndVisible(this.options.mapId, solarSystemId);
    if (result.exists && result.visible) {
      // do nothing
      solarSystem.resolve();
    } else if (result.exists && !result.visible) {
      await mapSqlActions.changeSystemVisibility(this.options.mapId, solarSystemId, true);

      let isOldVisible = await mapSqlActions.isSystemExistsAndVisible(this.options.mapId, _oldSystem);
      if(_oldSystem !== null && !isOldVisible.visible) {
        await mapSqlActions.changeSystemVisibility(this.options.mapId, _oldSystem, true);
        await this._notifySystemAdd(_oldSystem);
      }

      if (!exist(position)) {
        pos = await this.findPosition(_oldSystem, solarSystemId);
      }
      await this._systems[solarSystemId].updatePositions(pos.x, pos.y);
      await this._notifySystemAdd(solarSystemId);
      solarSystem.resolve();
    } else if (!result.exists) {
      let solarSystemInfo = await solarSystemSql.getSolarSystemInfo(solarSystemId);
      if (solarSystemInfo === null) {
        // solar system can be not found in list
        throw `Exception "Solar system ${ solarSystemId } is not exists in database..."`;
      }

      if (!exist(position)) {
        pos = await this.findPosition(_oldSystem, solarSystemId);
      }
      await solarSystem.create(solarSystemInfo.solarSystemName, pos);

      await this._notifySystemAdd(solarSystemId);
      solarSystem.resolve();
    }

    if (isNeedResolveAddingPromise) {
      await solarSystem.loadPromise();
      this._addingSystems[solarSystemId].resolve();
      return;
    }

    return solarSystem.loadPromise();
  }

  async _addLink (_sourceSystemId, _targetSystemId) {
    let chainInfo = this._chains[_sourceSystemId + '_' + _targetSystemId] || this._chains[_targetSystemId
    + '_'
    + _sourceSystemId];
    if (!chainInfo) {
      chainInfo = this._chains[_sourceSystemId + '_' + _targetSystemId] = {
        promise: new CustomPromise(),
      };

      let chainData = await mapSqlActions.getLinkByEdges(this.options.mapId, _sourceSystemId, _targetSystemId);
      if (!chainData) {
        let newChainId = _sourceSystemId + '_' + _targetSystemId;
        await mapSqlActions.addLink(this.options.mapId, newChainId, _sourceSystemId, _targetSystemId);
        this._chains[newChainId].model = new MapChain(this.options.mapId, newChainId);
        chainInfo.id = newChainId;
        this.subscribers.notifyLinkAdded(newChainId);
      } else {
        this._chains[chainInfo.id].model = new MapChain(this.options.mapId, chainInfo.id);
      }

      chainInfo.promise.resolve();
    }

    return chainInfo.promise.native;
  }

  async _linkPassage (_sourceSystemId, _targetSystemId, _characterId) {
    await this._addLink(_sourceSystemId, _targetSystemId);

    let link = await mapSqlActions.getLinkByEdges(this.options.mapId, _sourceSystemId, _targetSystemId);
    await mapSqlActions.updateChainPassages(this.options.mapId, link.id, ++link.countOfPassage);
    await mapSqlActions.addChainPassageHistory(
      this.options.mapId,
      _sourceSystemId,
      _targetSystemId,
      _characterId,
      this.characters[_characterId].currentShipType(),
    );

    //TODO А после этого, нужно отправить оповещение в гуй, что линк id был проинкрементирован
  }

  async _characterJoinToSystem (_characterId, _systemId) {
    this._createSystemObject(_systemId);
    await this._systems[_systemId].addCharacter(_characterId);
    this._charactersOnSystem[_characterId] = _systemId;
  }

  async _characterLeaveSystem (_characterId, _systemId) {
    // TODO it should update system time - need for removeing system from map.
    await mapSqlActions.updateSystem(this.options.mapId, _systemId, {})

    if (exist(this._systems[_systemId])) {
      await this._systems[_systemId].removeCharacter(_characterId);
      delete this._charactersOnSystem[_characterId];
    }
  }

  /**
   * It happens when character join in system and it is not move from system to system
   *
   * @param {string} _characterId
   * @param {string} solarSystemId
   * @return {Promise<void>}
   * @private
   */
  async _characterEnterToSystem (_characterId, solarSystemId) {
    let info = await solarSystemSql.getSolarSystemInfo(solarSystemId);
    if (info === null) {
      return;
    }

    const { systemClass } = info;

    let isExists = await this.systemExists(solarSystemId, true);
    let isAbleToEnter = !prohibitedSystemClasses.includes(parseInt(systemClass))
      && !prohibitedSystems.includes(parseInt(solarSystemId));

    // It happens when system is not exists on map
    if (!isExists && isAbleToEnter) {
      await this._addSystem(null, solarSystemId);
      isExists = true;
    }

    // Это происходит когда система уже была добавлена: вручную или в результате прохода в неё.
    if (isExists) {
      await this._characterJoinToSystem(_characterId, solarSystemId);
    }
  }

  async _characterMoveToSystem (_characterId, _oldSystem, _newSystem) {
    // System can be chained by gates and if it true, we consider system in known space.
    // But also system can be chained by the wormhole also, but we can detect it.
    let isJump = await core.sdeController.checkSystemJump(_oldSystem, _newSystem);

    const info = await solarSystemSql.getSolarSystemInfo(_newSystem);
    if (info === null) {
      return;
    }

    const { systemClass } = info;

    // This is will filter Jita and Abyss systems.
    let isAbleToMove = !prohibitedSystemClasses.includes(parseInt(systemClass))
      && !prohibitedSystems.includes(parseInt(_newSystem));

    if (!isJump && isAbleToMove) {
      let isSystemExists = await this.systemExists(_oldSystem, true);
      if (isSystemExists) {
        await this._addSystem(_oldSystem, _newSystem);
        await this._characterLeaveSystem(_characterId, _oldSystem);
        await this._characterJoinToSystem(_characterId, _newSystem);
        await this._linkPassage(_oldSystem, _newSystem, _characterId);
      } else {
        const isNextSystemExists = await this.systemExists(_newSystem, true);
        if(isNextSystemExists) {
          await this._addSystem(_newSystem, _oldSystem);
        } else {
          await this._addSystem(null, _oldSystem);
          await this._addSystem(_oldSystem, _newSystem);
        }

        await this._characterJoinToSystem(_characterId, _newSystem);
        await this._linkPassage(_oldSystem, _newSystem, _characterId);
      }
    } else {
      let isDestSystemExists = await this.systemExists(_newSystem, true);
      let isOldSystemExists = await this.systemExists(_oldSystem, true);

      if (isOldSystemExists) {
        await this._characterLeaveSystem(_characterId, _oldSystem);
      }

      if (isDestSystemExists) {
        await this._addSystem(_oldSystem, _newSystem);
        await this._characterJoinToSystem(_characterId, _newSystem);
      }
    }
  }

  async addChainManual (sourceSolarSystemId, targetSolarSystemId) {
    // надо проверить что система соединяется
    let link = await mapSqlActions.getLinkByEdges(this.options.mapId, sourceSolarSystemId, targetSolarSystemId);

    if (!link) {
      await this._addLink(sourceSolarSystemId, targetSolarSystemId);
      return true;
    }

    return false;
  }

  async addManual (solarSystemId, x, y) {
    this._createSystemObject(solarSystemId);
    let solarSystem = this._systems[solarSystemId];
    let result = await solarSystem.isSystemExistsAndVisible();


    if (result.visible) {
      return false;
      throw 'System already exists in map';
    }

    await this._addSystem(null, solarSystemId, { x: x, y: y });

    for (let characterId in this.characters) {
      let character = this.characters[characterId];
      if (character.isOnline() && character.location() === solarSystemId) {
        await this._characterJoinToSystem(characterId, solarSystemId);
      }
    }

    return true;
  }

  async addHub (solarSystemId) {
    let hubs = await core.dbController.mapsDB.get(this.options.mapId, 'hubs');

    let hasSystem = hubs.indexOf(solarSystemId.toString()) !== -1;

    if (!hasSystem) {
      hubs.push(solarSystemId.toString());
      await core.dbController.mapsDB.set(this.options.mapId, 'hubs', hubs);

      this.subscribers.notifyHubAdded(solarSystemId);
    }
  }

  async removeHub (solarSystemId) {
    let hubs = await core.dbController.mapsDB.get(this.options.mapId, 'hubs');

    let index = hubs.indexOf(solarSystemId.toString());
    if (index !== -1) {
      hubs.removeByIndex(index);
      await core.dbController.mapsDB.set(this.options.mapId, 'hubs', hubs);
      this.subscribers.notifyHubRemoved(solarSystemId);
    }
  }

  async getHubs () {
    return await core.dbController.mapsDB.get(this.options.mapId, 'hubs');
  }

  async getRoutesListForSolarSystemAdvanced (solarSystemId, hubs, settings) {
    let defaultSettings = {
      pathType: 'shortest',
      includeMassCrit: true,
      includeEol: true,
      includeFrig: true,
      includeCruise: true,
      avoidWormholes: false,
      avoidPochven: false,
      avoidEdencom: false,
      avoidTriglavian: false,
      includeThera: true,

      ...settings,
    };

    let connections = [];

    // If we avoid wormholes - map links will be avoiding
    // if we avoid wormholes - we avoiding also Thera
    if (!defaultSettings.avoidWormholes) {
      let mapChains = await this.getLinkPairsAdvanced(
        defaultSettings.includeFrig,
        defaultSettings.includeEol,
        defaultSettings.includeMassCrit,
      );

      let theraChains = [];
      if (defaultSettings.includeThera) {
        theraChains = core.thera.getChainPairs(
          defaultSettings.includeFrig,
          defaultSettings.includeEol,
          defaultSettings.includeMassCrit,
        );
      }

      let chains = removeIntersection(mapChains.concat(theraChains));
      if (!defaultSettings.includeCruise) {
        chains = chains.filter(x => {
          return !core.cachedDBData.wormholeClassAIndexed[x.first]
            && !core.cachedDBData.wormholeClassAIndexed[x.second];
        });
      }

      connections = chains.map(x => x.first + '|' + x.second)
        .concat(chains.map(x => x.second + '|' + x.first));
    }

    let avoidanceList = [];
    if (defaultSettings.avoidEdencom) {
      avoidanceList = avoidanceList.concat(core.cachedDBData.edencomSolarSystems);
    }

    if (defaultSettings.avoidTriglavian) {
      avoidanceList = avoidanceList.concat(core.cachedDBData.triglavianSolarSystems);
    }

    if (defaultSettings.avoidPochven) {
      avoidanceList = avoidanceList.concat(core.cachedDBData.pochvenSolarSystems);
    }

    let out = [];

    let arrRoutes = await Promise.all(
      hubs.map(destination =>
        this.loadRoute(destination, solarSystemId, defaultSettings.pathType, connections, avoidanceList),
      ),
    );

    for (let a = 0; a < arrRoutes.length; a++) {
      let destination = hubs[a];
      let route = arrRoutes[a];

      let arrInfo = await Promise.all(route.systems.map(x => getSolarSystemInfo(x, minimumRouteAttrs)));
      let info = await getSystemInfo(this.options.mapId, destination, true);

      out.push({
        hasConnection: route.hasConnection,
        systems: arrInfo,
        origin: solarSystemId,
        destination,
        destinationName: info?.userName || arrInfo[arrInfo.length - 1].solarSystemName,
      });
    }

    return out;
  }

  loadRoute (dest, origin, flag, connections, avoidanceList) {
    let pr = new CustomPromise();

    if (avoidanceList === undefined) {
      avoidanceList = [];
    }

    core.esiApi.routes(dest, origin, flag, connections, avoidanceList)
      .then(
        event => pr.resolve({ hasConnection: event.length > 0, systems: event.length === 0 ? [dest] : event }),
        () => pr.resolve({ hasConnection: false, systems: [dest] }),
      );

    return pr.native;
  }

  async findPosition (_oldSystemId, _systemId) {
    let newPosition = { x: 0, y: 0 };

    if (_oldSystemId !== null) {
      let oldSystemPositionResult = await mapSqlActions.getSystemPosition(this.options.mapId, _oldSystemId);

      if (exist(oldSystemPositionResult)) {
        let oldPosition = oldSystemPositionResult.position;
        newPosition = { x: oldPosition.x + 200, y: oldPosition.y };
      }
    }

    return newPosition;
  }

  async updateSystem (_systemId, _data) {
    this._systems[_systemId].update(_data);
  }

  async updateLink (chainId, data) {
    for (let attr in data) {
      if (attr === 'timeStatus') {
        data = { ...data, updated: new Date };
      }
    }

    await mapSqlActions.updateChain(this.options.mapId, chainId, data);
    let chain = await this.getChain(chainId);
    chain.update(data);
  }

  async updateSystemsPosition (_systemsPosition) {
    await Promise.all(_systemsPosition.map(x => this._systems[x.id].updatePositions(x.x, x.y)));
  }

  async getSystemInfo (_systemId) {
    this._createSystemObject(_systemId);
    return await this._systems[_systemId].getInfo();
  }

  async getLinkInfo (_linkId) {
    return await mapSqlActions.getLinkInfo(this.options.mapId, _linkId);
  }

  async getSystems () {
    return await mapSqlActions.getSystems(this.options.mapId);
  }

  async getLinks () {
    return await mapSqlActions.getLinks(this.options.mapId);
  }

  async getLinkPairs () {
    return await mapSqlActions.getLinkPairs(this.options.mapId);
  }

  async getLinkPairsAdvanced (includeFrig, includeEol, includeMassCrit) {
    return await mapSqlActions.getLinkPairsAdvanced(this.options.mapId, includeFrig, includeEol, includeMassCrit);
  }

  async systemExists (_systemId, checkVisible) {
    return await mapSqlActions.systemExists(this.options.mapId, _systemId, checkVisible);
  }

  async linkRemove (chainId) {
    // todo - процес удаления линка может быть только один раз
    // поэтому его надо блокировать
    let chainInfo = await mapSqlActions.linkRemove(this.options.mapId, chainId);
    let info;

    if (chainInfo) {
      await mapSqlActions.updateSystem(this.options.mapId, chainInfo.source)
      await mapSqlActions.updateSystem(this.options.mapId, chainInfo.target)

      info =
        this._chains[chainInfo.source + '_' + chainInfo.target] ||
        this._chains[chainInfo.target + '_' + chainInfo.source];
    }

    if (info) {
      this._chains[chainId].model.destructor();

      delete this._chains[chainInfo.source + '_' + chainInfo.target];
      delete this._chains[chainInfo.target + '_' + chainInfo.source];
    }

    this.subscribers.notifyLinkRemoved(chainId);
  }

  async systemRemove (_systemId) {
    await mapSqlActions.changeSystemVisibility(this.options.mapId, _systemId, false)

    let affectedLinks = await mapSqlActions.getLinksBySystem(this.options.mapId, _systemId);
    await Promise.all(affectedLinks.map(linkId => this.linkRemove(linkId)));

    await Promise.all(this._systems[_systemId]?.onlineCharacters?.map(x => {
      delete this._charactersOnSystem[x];
      return mapSqlActions.removeCharacterFromSystem(this.options.mapId, _systemId, x);
    }) || []);

    this.subscribers.notifySystemRemoved(_systemId);
    this.zkbSystemsProvider.removeSystem(_systemId);

    this._systems[_systemId]?.destructor();

    delete this._systems[_systemId];
  }

  /**
   *
   * @param connectionId
   * @param responseId
   * @param userId
   * @return {Promise<void>}
   */
  async subscribeAllowedCharacters (connectionId, responseId, userId) {
    const characters = await core.mapController.getTrackingCharactersForMapByUser(this.options.mapId, userId);

    characters.map(x => this._charactersOnUsers[x] = userId);

    if (!this._users[userId]) {
      this._users[userId] = new User(this.options.mapId, userId);
    }

    if (this._users[userId].subscribersCount() === 0) {
      let trackedCharacters = characters.reduce((acc, charId) => {
        if (!this.characters[charId]) {
          return acc;
        }

        acc.push({ charId, online: this.characters[charId].isOnline() });
        return acc;
      }, []);

      this._users[userId].updateAllowedCharacters(trackedCharacters);
    }

    this._users[userId].subscribeAllowedCharacters(connectionId, responseId);
  }

  async unsubscribeAllowedCharacters (connectionId, responseId, userId) {
    this._users[userId].characters.map(({ charId }) => delete this._charactersOnUsers[charId]);
    this._users[userId].unsubscribeAllowedCharacters(connectionId, responseId);
  }
}

// List of mixins
Object.assign(Map.prototype, CollectCharactersForBulk);

const removeIntersection = function (pairsArr) {
  let checkObj = Object.create(null);
  let out = [];

  pairsArr.map(x => {
    if (!checkObj[x.first + '_' + x.second] && !checkObj[x.second + '_' + x.first]) {
      checkObj[x.first + '_' + x.second] = true;
      out.push(x);
    }
  });

  return out;
};

const minimumRouteAttrs = [
  'systemClass',
  'classTitle',
  'security',
  'triglavianInvasionStatus',
  'solarSystemId',
  'solarSystemName',
];

module.exports = Map;