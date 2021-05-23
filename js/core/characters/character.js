/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/22/20.
 */

var Emitter           = require("./../../env/tools/emitter");
var classCreator      = require("./../../env/tools/class");
var extend            = require("./../../env/tools/extend");
var exist             = require("./../../env/tools/exist");
var waiter            = require("./../../env/tools/waiter");
var CustomPromise     = require("./../../env/promise");
var Cache             = require("./../../env/cache.js");

var Subscriber        = require("./../../utils/subscriber");
var log               = require("./../../utils/log");

var OAuth             = require("./../../esi/oauth.js");
var OnlineAttribute   = require("./attributes/online");
var LocationAttribute = require("./attributes/location");
var ShipAttribute     = require("./attributes/ship");
var WaypointEvent     = require("./events/waypoint");
var DBController      = require("./../dbController");

var Character = classCreator("Character", Emitter, {
    constructor: function Character(_options) {
        this.options = extend({
            showLogs: false,
            characterId: null
        },_options);

        Emitter.prototype.constructor.call(this);

        /** @type Subscriber */
        this._attributes = Object.create(null);
        this._isRefreshingToken = false;
        this._refreshAccessTokenResolver = null;
        this._refreshAccessTokenMaxCount = 10;
        this._refreshAccessTokenCount = 0;

        this._createEvents();
        this._createCachedAttrs();
    },
    destructor: function () {
        this.waypoint.destructor();

        for(var id in this._attributes)
            this._attributes[id].destructor();

        this._attributes = Object.create(null);
        this._isRefreshingToken = false;
        this._refreshAccessTokenResolver = null;
        this.options = Object.create(null);

        Emitter.prototype.destructor.call(this);
    },
    _createEvents: function () {
        this.waypoint = new WaypointEvent({
            accessToken: this.getAccessToken.bind(this)
        });

        !core.eveServer.isOnline() && this.waypoint.serverStatusOffline();
    },
    _createCachedAttrs () {
        this.realExpiresIn = new Cache({
            name: "realExpiresIn",
            getter: function (resolve, reject) {
                core.dbController.charactersDB.get(this.options.characterId, "realExpiresIn")
                    .then(resolve, reject);
            }.bind(this),
            setter: function (newVal, resolve, reject) {
                core.dbController.charactersDB.set(this.options.characterId, {realExpiresIn: newVal})
                    .then(resolve, reject);
            }.bind(this)
        });

        this.accessToken = new Cache({
            name: "accessToken",
            getter: function (resolve, reject) {
                core.dbController.charactersDB.get(this.options.characterId, "accessToken")
                    .then(resolve, reject);
            }.bind(this),
            setter: function (newVal, resolve, reject) {
                core.dbController.charactersDB.set(this.options.characterId, {accessToken: newVal})
                    .then(resolve, reject);
            }.bind(this)
        });

        this.refreshToken = new Cache({
            name: "refreshToken",
            getter: function (resolve, reject) {
                core.dbController.charactersDB.get(this.options.characterId, "refreshToken")
                    .then(resolve, reject);
            }.bind(this),
            setter: function (newVal, resolve, reject) {
                core.dbController.charactersDB.set(this.options.characterId, {refreshToken: newVal})
                    .then(resolve, reject);
            }.bind(this)
        });
    },
    has: function (_attribute) {
        return !!this._attributes[_attribute];
    },
    get: function (_attribute) {
        if(!this.has(_attribute)) {
            var _class = this._attributesFactory(_attribute);

            var instance = new _class({
                characterId: this.options.characterId,
                accessToken: this.getAccessToken.bind(this)
            });
            this._add(_attribute, instance);

            !core.eveServer.isOnline() && instance.serverStatusOffline();
        }

        return this._attributes[_attribute];
    },
    _add: function (_attribute, _instance) {
        this._attributes[_attribute] = _instance;
    },
    _attributesFactory: function (_attribute) {
        switch (_attribute) {
            case "online":
                return OnlineAttribute;
            case "location":
                return LocationAttribute;
            case "ship":
                return ShipAttribute;
        }
    },
    connectionBreak: function (_connectionId) {
        for(var id in this._attributes) {
            this._attributes[id].connectionBreak(_connectionId);
        }
    },
    getInfo: async function () {
         let attrs = ["name", "info", "addDate"];

         let result = await core.dbController.charactersDB.get(this.options.characterId, attrs);

         let out = {
             name: result.name,
             addDate: result.addDate
         }

         if (result.info.corporationId) {
             out.corporation = result.info.corporation.name;
             out.corporationId = result.info.corporationId;
             out.corporationTicker = result.info.corporation.ticker;
         }

         if (result.info.allianceId) {
             out.alliance = result.info.alliance.name;
             out.allianceId = result.info.allianceId;
             out.allianceTicker = result.info.alliance.ticker;
         }

         return out;
     },
    getCorporationId: async function () {
        let result = await core.dbController.charactersDB.get(this.options.characterId, ["info"]);
        return result.info.corporationId || -1;
    },
    getAllianceId: async function () {
        let result = await core.dbController.charactersDB.get(this.options.characterId, ["info"]);
        return result.info.allianceId || -1;
    },
    getName: async function () {
        let result = await core.dbController.charactersDB.get(this.options.characterId, ["name"]);
        return result.name;
    },
    getOwnerUserOnline: async function () {
        let condition = [
            {name: "type",operator: "=",value: DBController.linksTableTypes.userToCharacter },
            {name: "second",operator: "=",value: this.options.characterId}
        ];
        let userId = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return core.userController.getUserOnline(userId[0].first);
    },
    loadPublicCharacterInfo: function () {
        var pr = new CustomPromise();

        /**
         *   "ancestry_id": 11,
         *   "birthday": "2016-05-22T15:49:25Z",
         *   "bloodline_id": 1,
         *   "corporation_id": 98416313,
         *   "description": "",
         *   "gender": "male",
         *   "name": "Nevil Clavein",
         *   "race_id": 1,
         *   "security_status": 0,
         *
         *   "corporation" : {
         *        "ceo_id": 95845437,
         *        "creator_id": 95845437,
         *        "date_founded": "2015-08-31T03:49:09Z",
         *        "description": "Ы",
         *        "home_station_id": 60014629,
         *        "member_count": 13,
         *        "name": "Vault255",
         *        "shares": 1000,
         *        "tax_rate": 0,
         *        "ticker": "V255",
         *        "url": "http://kadmus.space"
         *   },
         *   "alliance" : {
         *       "creator_corporation_id": 369264884,
         *       "creator_id": 726526286,
         *       "date_founded": "2009-09-09T18:07:00Z",
         *       "executor_corporation_id": 369264884,
         *       "name": "U N K N O W N",
         *       "ticker": "KNOW"
         *   }
         *
         * @type {null}
         */
        var info = Object.create(null);
        info.corporation = Object.create(null);
        info.alliance = Object.create(null);

        core.esiApi.characters.info(this.options.characterId).then(function(_data){
            extend(info, _data);

            var prarr = [];

            info.corporationId && prarr.push(core.esiApi.corporation.info(info.corporationId));
            info.allianceId && prarr.push(core.esiApi.alliance.info(info.allianceId));

            return Promise.all(prarr);
        }.bind(this), function(_err){
            pr.reject({
                sub: _err,
                message: "Error on load info"
            });
        }.bind(this))

            // when load corporation info
            // _dataArr - where
            // 0 - is corporation info
            // 1 - is alliance info (optional)
        .then(function(_dataArr){
            _dataArr[0] && extend(info.corporation, _dataArr[0]);
            _dataArr[1] && extend(info.alliance, _dataArr[1]);

            pr.resolve(info);
        }.bind(this), function(_err){
            pr.reject({
                sub: _err,
                message: "Error on load corporation and alliance"
            });
        }.bind(this));

        return pr.native;
    },

    getAccessToken: function () {
        var pr = new CustomPromise();

        this._updateAccessToken()
            .then(
                () => this.accessToken.get(),
                err => pr.reject({
                    sub: err,
                    message: "Error on _updateAccessToken"
                })
            )
            .then(
                accessToken => pr.resolve(accessToken),
                err => pr.reject({
                    sub: err,
                    message: "Error on get from [charactersDB] - accessToken"
                })
            )

        return pr.native;
    },

    _checkAccessTokenExpire: function () {
        var pr = new CustomPromise();

        this.realExpiresIn.get().then(val => {
            var timeToExpires = val - +new Date;
            this.options.showLogs && log(log.INFO, `[Character:${this.options.characterId}] Time to token expires is ${timeToExpires}`);
            pr.resolve(timeToExpires <= 0);
        }, err => {
            pr.reject({
                sub: err,
                message: "Error on load realExpiresIn"
            });
        })

        return pr.native;
    },
    _updateAccessToken: function () {
        var pr = new CustomPromise();

        this._checkAccessTokenExpire().then(function(_isExpire){
            if(_isExpire){
                this._refreshAccessToken().then(function(){
                    pr.resolve();
                }.bind(this), function(_err){
                    pr.reject({
                        sub: _err,
                        message: "Error try refresh accessToken"
                    });
                }.bind(this));
            } else {
                pr.resolve(); // when token not expired
            }

        }.bind(this), function(_err){
            pr.reject({
                sub: _err,
                message: "Error on check AccessTokenExpire"
            });
        }.bind(this));

        return pr.native;
    },
    _refreshAccessToken: async function () {
        if(!this._isRefreshingToken) {

            this._refreshAccessTokenResolver = new CustomPromise();
            this._isRefreshingToken = true;

            var isNotExit = true;
            while(isNotExit) {
                try {
                    log(log.INFO, `[Character:${this.options.characterId}] Try refreshing token (${this._refreshAccessTokenCount}/${this._refreshAccessTokenMaxCount})`);

                    var refreshToken = await this.refreshToken.get();

                    var startLoadTime = +new Date;
                    var _event = await OAuth.refreshToken(refreshToken);
                    var loadingTime = +new Date - startLoadTime;

                    var realExpiresIn = (+new Date + _event.expires_in * 1000) - loadingTime;

                    await this.realExpiresIn.set(realExpiresIn);
                    await this.accessToken.set(_event.access_token);
                    await this.refreshToken.set(_event.refresh_token);

                    this._isRefreshingToken = false;
                    this._refreshAccessTokenResolver.resolve();
                    isNotExit = false;

                    log(log.INFO, `[Character:${this.options.characterId}] Token successfully updated`);
                } catch (_err) {
                    log(log.INFO, `[Character:${this.options.characterId}] Error on try refresh token =>`, JSON.stringify(_err));
                    await waiter(1000);

                    if (this._refreshAccessTokenCount < this._refreshAccessTokenMaxCount) {
                        this._refreshAccessTokenCount++;
                    } else {
                        isNotExit = false;
                        this._isRefreshingToken = false;
                        this._refreshAccessTokenResolver.reject();
                    }
                }
            }
        }

        return this._refreshAccessTokenResolver.native;
    },
    serverStatusOffline () {
        this.waypoint.serverStatusOffline();

        for(let attrName in this._attributes) {
            this._attributes[attrName].serverStatusOffline();
        }
    },
    serverStatusOnline () {
        this.waypoint.serverStatusOnline();

        for(let attrName in this._attributes) {
            this._attributes[attrName].serverStatusOnline();
        }
    }
});


module.exports = Character;