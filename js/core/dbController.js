var Emitter       = require("./../env/tools/emitter");
var classCreator  = require("./../env/tools/class");
var extend        = require("./../env/tools/extend");
var printf        = require("./../env/tools/print_f");
var Path          = require("./../env/tools/path");
var CustomPromise = require("./../env/promise");
var fs            = require("fs");
var DB            = require("./../utils/db");
var log           = require("./../utils/log");
var Client        = require('pg').Client;


var DBController = classCreator("DBController", Emitter, {
    constructor: function DBController() {
        Emitter.prototype.constructor.call(this);

        this.db = new DB({
            client: new Client({
                user: config.db.user,
                host: config.db.host,
                database: config.db.name,
                password: config.db.password,
                port: config.db.port,
            })
        });

        this.sdeDB = new DB({
            client: new Client({
                user: config.db.user,
                host: config.db.host,
                database: "eveStaticData",
                password: config.db.password,
                port: config.db.port,
            })
        });

        this.mdDB = new DB({
            client: new Client({
                user: config.db.user,
                host: config.db.host,
                database: "eveManualData",
                password: config.db.password,
                port: config.db.port,
            })
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
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    init: async function () {
        log(log.DEBUG, printf("dbController loading..."));

        var pr = new CustomPromise();

        await this.sdeDB.init();
        await this.mdDB.init();
        await this.db.init();

        var prarr = [];

        prarr.push(this.userDB.init());
        prarr.push(this.tokensDB.init());
        prarr.push(this.charactersDB.init());
        prarr.push(this.mapsDB.init());
        prarr.push(this.groupsDB.init());
        prarr.push(this.linksTable.init());
        prarr.push(this.groupToCharacterTable.init());
        prarr.push(this.mapLinksTable.init());
        prarr.push(this.mapSystemsTable.init());
        prarr.push(this.mapSystemToCharacterTable.init());

        await Promise.all(prarr);

        log(log.DEBUG, printf("dbController loaded."));

        pr.resolve();

        return pr.native;
    },
    _createUserDB: function () {
        this.userDB = this.db.createTable({
            name: "users",
            idField: "id",
            properties: [
                {name: "id",       type: String},
                {name: "name",     type: String},
                {name: "online",   type: Boolean},
                {name: "mail",     type: String},
                {name: "type",     type: Number, defaultValue: 0},  // 0 - by mail and password
                                                                    // 1 - by eve sso auth
                {name: "password", type: String}
            ]
        });
    },
    _createTokensDB: function () {
        this.tokensDB = this.db.createTable({
            name: "tokens",
            idField: "id",
            properties: [
                {name: "id",     type: String},
                {name: "value",  type: String},
                {name: "expire", type: Date}
            ]
        });
    },
    _createCharactersDB: function () {
        this.charactersDB = this.db.createTable({
            name: "characters",
            idField: "id",
            properties: [
                {name: "id",                 type: String},
                {name: "name",               type: String},
                {name: "expiresOn",          type: String},
                {name: "expiresIn",          type: Number}, // in seconds
                {name: "realExpiresIn",      type: Number}, // in milliseconds - its date
                {name: "scopes",             type: String},
                {name: "characterOwnerHash", type: String},
                {name: "accessToken",        type: String},
                {name: "refreshToken",       type: String},
                {name: "tokenType",          type: String},
                {name: "online",             type: Boolean},
                {name: "location",           type: String},
                {name: "ship",               type: String},
                {name: "images",             type: Object},
                {name: "infoExpiresIn",      type: Number},    // in milliseconds
                {name: "info",               type: Object},
            ]
        });
    },
    _createMapsDB: function () {
        this.mapsDB = this.db.createTable({
            name: "maps",
            idField: "id",
            properties: [
                {name: "id",          type: String},
                {name: "name",        type: String},
                {name: "description", type: String},
                {name: "owner",       type: String,  index: true},   // this is id of mapper character
                {name: "private",     type: Boolean},
                // {name: "guestGroup",  type: String}

            ]
        });
    },
    _createGroupsDB: function () {
        this.groupsDB = this.db.createTable({
            name: "groups",
            idField: "id",
            properties: [
                {name: "id",                    type: String},
                {name: "name",                  type: String},
                {name: "description",           type: String},
                {name: "owner",                 type: String, index: true},   // this is id of mapper character
            ]
        });
    },
    _createLinksTable: function () {
        this.linksTable = this.db.createTable({
            name: "links",
            idField: "type",
            properties: [
                {name: "type",   type: String},
                {name: "first",  type: String},
                {name: "second", type: String}
            ]
        });
    },
    _createGroupToCharacterTable: function () {
        this.groupToCharacterTable = this.db.createTable({
            name: "group2character",
            idField: "groupId",
            properties: [
                {name: "groupId",      type: String},
                {name: "characterId",  type: String},
                {name: "track",        type: Boolean, defaultValue: function () {return false}}
            ]
        });
    },
    _createMapLinksTable: function () {
        this.mapLinksTable = this.db.createTable({
            name: "map_links",
            idField: "id",
            properties: [
                {name: "id",                type: String},
                {name: "mapId",             type: String},
                {name: "solarSystemSource", type: String},
                {name: "solarSystemTarget", type: String},
                {
                    name: "lifeTime", type: Number, defaultValue: function () {
                        return +new Date + (1000 * 60 * 60 * 24 * 2)     // maximum wormhole lifetime is two days
                    }
                },
                {
                    name: "openingTime",    type: String,                // time when user added wormhole to map
                    defaultValue: function () {
                        return +new Date;                                // maximum wormhole lifetime is two days
                    }
                },
                {name: "massStatus", type: Number, defaultValue: 0},     // Mass state can be from 0 to 2;
                                                                         // where 0 - greater than half
                                                                         // where 1 - less than half
                                                                         // where 2 - critical less than 10%

                {name: "timeStatus", type: Number, defaultValue: 0},     // Time state can be from 0 to 2
                                                                         // where 0 - normal
                                                                         // where 1 - end of life

                {name: "shipSizeType",   type: Number, defaultValue: 1}, // Ship size type
                                                                         // where 0 - Frigate
                                                                         // where 1 - Medium and Large
                                                                         // where 2 - Capital
                {name: "wormholeType",   type: String},
                {name: "countOfPassage", type: Number, defaultValue: 0}
            ]
        });
    },
    _createMapSystemsTable: function () {
        this.mapSystemsTable = this.db.createTable({
            name: "map_systems",
            idField: "id",
            properties: [
                {name: "id",            type: String},                       // eve solar system identifier
                {name: "mapId",         type: String},
                {name: "isLocked",      type: Boolean},
                {name: "name",          type: String},                       // by default it will default solar system name
                {name: "description",   type: String},                       // some description about this system
                {name: "tag",           type: String},                       // system tag
                {name: "signatures",    type: Array},
                {name: "type",          type: Object},                       // type of system - wormhole/lowsec/nullsec/highsec/abyss
                {name: "effects",       type: String},                       // if it wormhole or abyss, system my have had some effects
                {name: "visible",       type: Boolean, defaultValue: true},  // if it false system is not show at the map (this flag for delete)
                {name: "position",      type: Object,  defaultValue: function () { return {x: 0, y: 0} } },
            ]
        });
    },

    /**
     * This table allow us to know who in the systems.
     * @private
     */
    _createMapSystemToCharacter: function () {
        this.mapSystemToCharacterTable = this.db.createTable({
            name: "map_systems_to_character",
            idField: "mapId",
            properties: [
                {name: "mapId",       type: String},
                {name: "systemId",    type: String},
                {name: "characterId", type: String}
            ]
        });
    }
});

DBController.linksTableTypes = {
    /**
     * We bing userId to character what was added to server
     * a character is user own
     */
    userToCharacter: "userToCharacter",
    /**
     * Here it's mean what a character have permission to see this group
     */
    groupToCharacter: "groupToCharacter",
    /**
     * Here it's mean what a corporation have permission to see this group
     */
    groupToCorporation: "groupToCorporation",
    /**
     * Here it's mean what a corporation have permission to see this group
     */
    groupToAlliance: "groupToAlliance",
    /**
     * This type allow find group what bind to map
     */
    mapToGroups: "mapToGroups",

};

module.exports = DBController;