const Emitter = require('./../env/_new/tools/emitter');
const printf = require('./../env/tools/print_f');
const CustomPromise = require('./../env/promise');
const DB = require('./../utils/db');
const log = require('./../utils/log');
const Client = require('pg').Client;


class DBController extends Emitter{
  constructor () {
    super();

    this.db = new DB({
      client: new Client({
        user: config.db.user,
        host: config.db.host,
        database: config.db.names.mapper,
        password: config.db.password,
        port: config.db.port,
      }),
    });

    this.sdeDB = new DB({
      client: new Client({
        user: config.db.user,
        host: config.db.host,
        database: config.db.names.eveSde,
        password: config.db.password,
        port: config.db.port,
      }),
    });

    this.cacheDb = new DB({
      client: new Client({
        user: config.db.user,
        host: config.db.host,
        database: config.db.names.cachedESD,
        password: config.db.password,
        port: config.db.port,
      }),
    });

    this._createUserDB();
    this._createTokensDB();
    this._createCharactersDB();
    this._createMapsDB();
    this._createGroupsDB();
    this._createLinksTable();
    this._createGroupToCharacterTable();
    this._createMapLinksTable();
    this._createMapSystemsTable();
    this._createMapSystemToCharacter();
    this._createCachedSolarSystemsTable();
    this._createUserAction();
    this._createChainPassages();
  }

  async init () {
    log(log.DEBUG, printf('dbController loading...'));

    var pr = new CustomPromise();

    await this.sdeDB.init();
    await this.db.init();
    await this.cacheDb.init();

    try {
      // var prarr = [];
      await this.userDB.init();
      log(log.INFO, 'userDB inited');
      await this.tokensDB.init();
      log(log.INFO, 'tokensDB inited');
      await this.charactersDB.init();
      log(log.INFO, 'charactersDB inited');
      await this.mapsDB.init();
      log(log.INFO, 'mapsDB inited');
      await this.groupsDB.init();
      log(log.INFO, 'groupsDB inited');
      await this.linksTable.init();
      log(log.INFO, 'linksTable inited');
      await this.groupToCharacterTable.init();
      log(log.INFO, 'groupToCharacterTable inited');
      await this.mapLinksTable.init();
      log(log.INFO, 'mapLinksTable inited');
      await this.mapChainPassagesTable.init();
      log(log.INFO, 'mapChainPassagesTable inited');
      await this.mapSystemsTable.init();
      log(log.INFO, 'mapSystemsTable inited');
      await this.mapSystemToCharacterTable.init();
      log(log.INFO, 'mapSystemToCharacterTable inited');
      await this.solarSystemsTable.init();
      log(log.INFO, 'solarSystemsTable inited');
      await this.userActionsTable.init();
      log(log.INFO, 'userActionsTable inited');
    } catch (e) {
      log(log.ERR, JSON.stringify(e, true, 3));
    }

    log(log.DEBUG, printf('dbController loaded.'));

    pr.resolve();

    return pr.native;
  }

  _createUserDB () {
    this.userDB = this.db.createTable({
      name: 'users',
      idField: 'id',
      properties: [
        { name: 'id', type: String },
        { name: 'name', type: String },
        { name: 'online', type: Boolean },
        { name: 'mail', type: String },
        { name: 'type', type: Number, defaultValue: 0 },  // 0 - by mail and password
                                                          // 1 - by eve sso auth
        { name: 'password', type: String },
      ],
    });
  }

  _createTokensDB () {
    this.tokensDB = this.db.createTable({
      name: 'tokens',
      idField: 'id',
      properties: [
        { name: 'id', type: String },
        { name: 'value', type: String },
        { name: 'expire', type: Date },
      ],
    });
  }

  _createCharactersDB () {
    this.charactersDB = this.db.createTable({
      name: 'characters',
      idField: 'id',
      properties: [
        { name: 'id', type: String },
        { name: 'name', type: String },
        { name: 'expiresOn', type: String },
        { name: 'expiresIn', type: Number }, // in seconds
        { name: 'realExpiresIn', type: Number }, // in milliseconds - its date
        { name: 'scopes', type: String },
        { name: 'characterOwnerHash', type: String },
        { name: 'accessToken', type: String },
        { name: 'refreshToken', type: String },
        { name: 'tokenType', type: String },
        { name: 'online', type: Boolean, defaultValue: false },
        { name: 'location', type: String },
        { name: 'ship', type: Number },
        { name: 'addDate', type: Date, defaultValue: () => new Date },
      ],
    });
  }

  _createMapsDB () {
    this.mapsDB = this.db.createTable({
      name: 'maps',
      idField: 'id',
      properties: [
        { name: 'id', type: String },
        { name: 'name', type: String },
        { name: 'description', type: String },
        { name: 'personalNote', type: String },
        { name: 'owner', type: String, index: true },   // this is id of mapper character
        { name: 'hubs', type: Array, defaultValue: () => [] },
      ],
    });
  }

  _createGroupsDB () {
    this.groupsDB = this.db.createTable({
      name: 'groups',
      idField: 'id',
      properties: [
        { name: 'id', type: String },
        { name: 'name', type: String },
        { name: 'description', type: String },
        { name: 'personalNote', type: String },
        { name: 'owner', type: String, index: true },   // this is id of mapper character
      ],
    });
  }

  _createLinksTable () {
    this.linksTable = this.db.createTable({
      name: 'links',
      idField: 'type',
      properties: [
        { name: 'type', type: String },
        { name: 'first', type: String },
        { name: 'second', type: String },
      ],
    });
  }

  _createGroupToCharacterTable () {
    this.groupToCharacterTable = this.db.createTable({
      name: 'group2character',
      idField: 'groupId',
      properties: [
        { name: 'groupId', type: String },
        { name: 'characterId', type: String },
        { name: 'track', type: Boolean, defaultValue: () => false },
      ],
    });
  }

  _createMapLinksTable () {
    this.mapLinksTable = this.db.createTable({
      name: 'map_links',
      idField: 'id',
      properties: [
        { name: 'id', type: String },
        { name: 'mapId', type: String },
        { name: 'solarSystemSource', type: String },
        { name: 'solarSystemTarget', type: String },
        { name: 'massStatus', type: Number, defaultValue: 0 }, // Mass state can be from 0 to 2;
                                                               // where 0 - greater than half
                                                               // where 1 - less than half
                                                               // where 2 - critical less than 10%

        { name: 'timeStatus', type: Number, defaultValue: 0 }, // Time state can be from 0 to 2
                                                               // where 0 - normal
                                                               // where 1 - end of life

        { name: 'shipSizeType', type: Number, defaultValue: 1 }, // Ship size type
                                                                 // where 0 - Frigate
                                                                 // where 1 - Medium and Large
                                                                 // where 2 - Capital
        { name: 'wormholeType', type: String },
        { name: 'countOfPassage', type: Number, defaultValue: 0 },
        { name: 'created', type: Date, defaultValue: () => new Date },
        { name: 'updated', type: Date, defaultValue: () => new Date },
      ],
    });
  }

  _createChainPassages () {
    this.mapChainPassagesTable = this.db.createTable({
      name: 'map_chain_passages',
      idField: 'id',
      properties: [
        { name: 'mapId', type: String },
        { name: 'solarSystemSourceId', type: String },
        { name: 'solarSystemTargetId', type: String },
        { name: 'time', type: Date, defaultValue: () => new Date },
        { name: 'characterId', type: String },
        { name: 'shipTypeId', type: String },
      ],
    });
  }

  _createMapSystemsTable () {
    this.mapSystemsTable = this.db.createTable({
      name: 'map_systems',
      idField: 'id',
      properties: [
        { name: 'id', type: String },                             // eve solar system identifier
        { name: 'mapId', type: String },
        { name: 'isLocked', type: Boolean },
        { name: 'name', type: String },                           // by default it will default solar system name
        { name: 'userName', type: String, willEscaped: true },    // user title of system - will override main
        { name: 'description', type: String, willEscaped: true }, // some description about this system
        { name: 'tag', type: String },                            // system tag
        { name: 'labels', type: String },                         // system tag
        { name: 'status', type: Number, defaultValue: 0 },        // system tag
        { name: 'signatures', type: Array },
        { name: 'visible', type: Boolean, defaultValue: true },   // if it false system is not show at the map (this flag for delete)
        { name: 'position', type: Object, defaultValue: () => ({ x: 0, y: 0 }) },
        { name: 'firstAddTime', type: Date, defaultValue: () => new Date },
        { name: 'lastAddTime', type: Date, defaultValue: () => new Date },
        { name: 'updatedTime', type: Date, defaultValue: () => new Date },
      ],
    });
  }

  /**
   * This table allow us to know who in the systems.
   * @private
   */
  _createMapSystemToCharacter () {
    this.mapSystemToCharacterTable = this.db.createTable({
      name: 'map_systems_to_character',
      idField: 'mapId',
      properties: [
        { name: 'mapId', type: String },
        { name: 'systemId', type: String },
        { name: 'characterId', type: String },
      ],
    });
  }

  _createCachedSolarSystemsTable () {
    this.solarSystemsTable = this.cacheDb.createTable({
      name: 'solar_systems',
      idField: 'solarSystemId',
      properties: [
        { name: 'systemClass', type: Number },
        { name: 'security', type: String },
        { name: 'solarSystemId', type: Number },
        { name: 'constellationId', type: Number },
        { name: 'regionId', type: Number },
        { name: 'solarSystemName', type: String },
        { name: 'constellationName', type: String },
        { name: 'regionName', type: String },
        { name: 'typeDescription', type: String },
        { name: 'classTitle', type: String },
        { name: 'isShattered', type: Boolean },
        { name: 'effectName', type: String },
        { name: 'effectPower', type: Number },
        { name: 'statics', type: Array },
        { name: 'wanderers', type: Array },
        { name: 'solarSystemNameLC', type: String },
        { name: 'triglavianInvasionStatus', type: String },
        { name: 'sunTypeId', type: Number },
      ],
    });
  }


  /**
   * This table allow us to know who in the systems.
   * @private
   */
  _createUserAction () {
    this.userActionsTable = this.db.createTable({
      name: 'user_actions',
      idField: 'userId',
      properties: [
        { name: 'userId', type: String },
        { name: 'entityId', type: String },    // Id of Map/Access List
        { name: 'entityType', type: String },  // Map, Access List
        { name: 'eventType', type: String },
        { name: 'date', type: Date, defaultValue: () => new Date },
        { name: 'additionalData', type: String, willEscaped: true },
      ],
    });
  }
}

DBController.linksTableTypes = {
  /**
   * We bing userId to character what was added to server
   * a character is user own
   */
  userToCharacter: 'userToCharacter',
  /**
   * Here it's mean what a character have permission to see this group
   */
  groupToCharacter: 'groupToCharacter',
  /**
   * Here it's mean what a corporation have permission to see this group
   */
  groupToCorporation: 'groupToCorporation',
  /**
   * Here it's mean what a corporation have permission to see this group
   */
  groupToAlliance: 'groupToAlliance',
  groupToModerator: 'groupToModerator',
  /**
   * This type allow find group what bind to map
   */
  mapToGroups: 'mapToGroups',

};

module.exports = DBController;