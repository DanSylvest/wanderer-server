/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 6/19/20.
 */

// var Emitter        = require("./../env/tools/emitter");
// var classCreator   = require("./../env/tools/class");
var CustomPromise    = require("./../env/promise");
var extend           = require("./../env/tools/extend");
var exist            = require("./../env/tools/exist");
var ESI              = require("./generated/javascript-client/src/index.js");
const fs             = require("fs")

var locationApi      = new ESI.LocationApi();
var searchApi        = new ESI.SearchApi();
var routesApi        = new ESI.RoutesApi();
var characterApi     = new ESI.CharacterApi();
var corporationApi   = new ESI.CorporationApi();
var allianceApi      = new ESI.AllianceApi();
var userInterfaceApi = new ESI.UserInterfaceApi();
var statusApi        = new ESI.StatusApi();

var publicData = {
    datasource: config.eve.datasource
};

var __esi_characters_portrait = function (_characterId) {
    var pr = new CustomPromise();

    var base = extend(publicData, {});
    characterApi.getCharactersCharacterIdPortrait(_characterId, base, function (error, data, response) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(data);
    });

    return pr.native;
};

var __esi_characters_info = function (_characterId) {
    var pr = new CustomPromise();

    var base = extend(publicData, {});

    characterApi.getCharactersCharacterId(_characterId, base, function (error, data, response) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(data);
    });

    return pr.native;
};

var __esi_corporation_info = function (_corporationId) {
    var pr = new CustomPromise();

    var base = extend(publicData, {});

    corporationApi.getCorporationsCorporationId(_corporationId, base, function (error, data, response) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(data);
    });

    return pr.native;
};

var __esi_alliance_info = function (_allianceId) {
    var pr = new CustomPromise();

    var base = extend(publicData, {});

    allianceApi.getAlliancesAllianceId(_allianceId, base, function (error, data, response) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(data);
    });

    return pr.native;
};

var __esi_location_online = function (_accessToken, _characterId) {
    var pr = new CustomPromise();

    var base = extend(publicData, {
        token: _accessToken
    });

    locationApi.getCharactersCharacterIdOnline(_characterId, base, function (error, data, response) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(data);
    });

    return pr.native;
};

var __esi_location_current = function (_accessToken, _characterId) {
    var pr = new CustomPromise();

    var base = extend(publicData, {
        token: _accessToken
    });

    locationApi.getCharactersCharacterIdLocation(_characterId, base, function (error, data, response) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(data);
    });

    return pr.native;
};

var __esi_location_ship = function (_accessToken, _characterId) {
    var pr = new CustomPromise();

    var base = extend(publicData, {
        token: _accessToken
    });

    locationApi.getCharactersCharacterIdShip(_characterId, base, function (error, data, response) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(data);
    });

    return pr.native;
};

var __esi_uiapi_waypoint = function (_accessToken, addToBeginning, clearOtherWaypoints, destinationId) {
    var pr = new CustomPromise();

    var base = extend(publicData, {
        token: _accessToken
    });

    userInterfaceApi.postUiAutopilotWaypoint(addToBeginning, clearOtherWaypoints, destinationId, base, function (error, data, response) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(data);
    });

    return pr.native;
};

var _search = function (_categories, _match) {
    var pr = new CustomPromise();

    var base = extend(publicData, {
        strict: false
    });

    searchApi.getSearch(_categories, _match, base, function (error, data, response) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(data);
    });

    return pr.native;
};

const _routes = function (destination, origin, flag, connections) {
    let pr = new CustomPromise();

    let base = extend(publicData, {
        flag: flag || "secure",
        connections: connections || []
    });

    routesApi.getRouteOriginDestination(destination, origin, base, function (error, data, response) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(data);
    });

    return pr.native;
};

const _get_status = function () {
    let pr = new CustomPromise();
    let base = extend(publicData, {});

    // FOR TESTS
    let manualOffline = new fs.existsSync('./js/esi/offline');
    if(manualOffline) {
        pr.resolve({online: false, vip: false, players: 0, server_version: "", start_time: ""});
        return pr.native;
    }
    // FOR TESTS

    statusApi.getStatus(base, function (error, data, response) {
        // so...
        if(exist(error) && exist(error.status) && error.status === 504 && error.message === "Timeout contacting tranquility") {
            pr.resolve({online: false, vip: false, players: 0, server_version: "", start_time: ""});
        } else if(!exist(error)) {
            // if vip status - offline
            if(data.vip) {
                pr.resolve(extend(data, {online: false}));
            } else {
                pr.resolve(extend(data, {online: true}))
            }
        } else {
            pr.reject(error);
        }

    });

    return pr.native;
};

module.exports = {
    uiapi: {
        waypoint: __esi_uiapi_waypoint
    },
    location: {
        current: __esi_location_current,
        online: __esi_location_online,
        ship: __esi_location_ship
    },
    corporation: {
        info: __esi_corporation_info,
    },
    alliance: {
        info: __esi_alliance_info
    },
    characters: {
        portrait: __esi_characters_portrait,
        info: __esi_characters_info,
    },
    status: _get_status,
    search: _search,
    routes: _routes
};