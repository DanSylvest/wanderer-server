/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Emitter           = require("./../../env/tools/emitter");
var classCreator      = require("./../../env/tools/class");
var extend            = require("./../../env/tools/extend");
var CustomPromise     = require("./../../env/promise");

var Subscriber        = require("./../../utils/subscriber");
var log               = require("./../../utils/log");

var OAuth             = require("./../eveSwaggerInterface/oauth");
var OnlineAttribute   = require("./attributes/online");
var LocationAttribute = require("./attributes/location");
var ShipAttribute     = require("./attributes/ship");
var WaypointEvent     = require("./events/waypoint");
var DBController      = require("./../dbController");

var Character = classCreator("Character", Emitter, {
    constructor: function Character(_options) {
        this.options = extend({
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
         let attrs = ["name", "images", "online", "ship", "info"];
        //getShipTypeInfo

        let result = await core.dbController.charactersDB.get(this.options.characterId, attrs);

        let shipName = "capsule";
        if(result.ship) {
            let shipInfo = await core.sdeController.getShipTypeInfo(result.ship);
            shipName = shipInfo.typeName;
        }

        return {
            name: result.name,
            images: result.images,
            online: result.online,
            ship: shipName,
            corporation: result.info.corporation.name,
            alliance: result.info.alliance.name,
        }
    },
    getCorporationId: function () {
        var pr = new CustomPromise();

        core.dbController.charactersDB.get(this.options.characterId, ["info"]).then(function(_result) {
            pr.resolve(_result.info.corporationId || -1)
        }.bind(this),function(_err) {
            pr.reject(_err)
        }.bind(this));

        return pr.native;
    },
    getAllianceId: function () {
        var pr = new CustomPromise();

        core.dbController.charactersDB.get(this.options.characterId, ["info"]).then(function(_result) {
            pr.resolve(_result.info.allianceId || -1)
        }.bind(this),function(_err) {
            pr.reject(_err)
        }.bind(this));

        return pr.native;
    },
    getName: function () {
        var pr = new CustomPromise();

        core.dbController.charactersDB.get(this.options.characterId, ["name"]).then(function(_result){
            pr.resolve(_result.name);
        }.bind(this), function(_err){
            pr.reject(_err)
        }.bind(this));

        return pr.native;
    },
    getOwnerUserOnline: async function () {
        var pr = new CustomPromise();

        var condition = [
            {name: "type",operator: "=",value: DBController.linksTableTypes.userToCharacter },
            {name: "second",operator: "=",value: this.options.characterId}
        ];

        try {
            var userId = await core.dbController.linksTable.getByCondition(condition, ["first"]);
            var isOnline = await core.userController.getUserOnline(userId[0].first);
            pr.resolve(isOnline);
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
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
                message: "Error on load charInfo"
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

        this._updateAccessToken().then(function(){
            return core.dbController.charactersDB.get(this.options.characterId, "accessToken");
        }.bind(this), function(_err){
            pr.reject({
                sub: _err,
                message: "Error on _updateAccessToken"
            });
        }.bind(this)).then(function(_accessToken){
            pr.resolve(_accessToken);
        }.bind(this), function(_err){
            pr.reject({
                sub: _err,
                message: "Error on get from [charactersDB] - accessToken"
            });
        }.bind(this));

        return pr.native;
    },

    _checkAccessTokenExpire: function () {
        var pr = new CustomPromise();

        core.dbController.charactersDB.get(this.options.characterId, "realExpiresIn").then(function(_value){
            var timeToExpires = _value - +new Date;
            log(log.INFO, "Time to token expires is %s", timeToExpires);
            pr.resolve(timeToExpires <= 0);
        }.bind(this), function(_err){
            pr.reject({
                sub: _err,
                message: "Error on load realExpiresIn"
            });
        }.bind(this));

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
                    log(log.INFO, "Try refreshing token (%s/%s)", this._refreshAccessTokenCount, this._refreshAccessTokenMaxCount);

                    var refreshToken = await core.dbController.charactersDB.get(this.options.characterId, "refreshToken")

                    var startLoadTime = +new Date;
                    var _event = await OAuth.refreshToken(refreshToken);
                    var loadingTime = +new Date - startLoadTime;

                    var realExpiresIn = (+new Date + _event.expires_in * 1000) - loadingTime;

                    var attrs = {
                        refreshToken: _event.refresh_token,
                        accessToken: _event.access_token,
                        realExpiresIn: realExpiresIn,
                    };

                    await core.dbController.charactersDB.set(this.options.characterId, attrs);

                    this._isRefreshingToken = false;
                    this._refreshAccessTokenResolver.resolve();
                    isNotExit = false;

                    log(log.INFO, "Token successfully updated");
                } catch (_err) {
                    log(log.INFO, "Error on try refresh token =>", JSON.stringify(_err));

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
    }
});



module.exports = Character;