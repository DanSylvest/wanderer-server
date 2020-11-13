/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

const exist = require("./../../../env/tools/exist");

/**
 * @param _connectionId
 * @param _responseId
 * @param {Object} _event
 * @param {String} _event.name
 * @param {String} _event.description
 * @param {Boolean} _event.shareForCorporation
 * @param {Boolean} _event.shareForAlliance
 * @param {Number} _event.characterId
 * @returns {*}
 */
const request = async function (_connectionId, _responseId, _event) {
    if(!checkTypes(_connectionId, _responseId, _event)) {
        return;
    }


    // we need get token by connection
    var token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    try {
        var userId = await core.tokenController.checkToken(token);
        var props = {
            name: _event.name,
            description: _event.description,
            shareForCorporation: _event.shareForCorporation,
            shareForAlliance: _event.shareForAlliance,
            characterId: _event.characterId
        };

        let result = await core.mapController.createMapFast(userId, props);
        api.send(_connectionId, _responseId, {
            mapData: result,
            // mapId: mapId,
            // userId: userId,
            eventType: "responseEveMapAddFast",
            success: true
        });
    } catch (_err) {
        _sendError(_connectionId, _responseId, "Error on create map");
    }
};

const checkTypes = function (_connectionId, _responseId, _event) {
    if(!exist(_event.name) && typeof _event.name !== "string") {
        _sendError(_connectionId, _responseId, `Invalid parameter "name"`);
        return false;
    }

    if(!exist(_event.description) && typeof _event.description !== "string") {
        _sendError(_connectionId, _responseId, `Invalid parameter "shareForCorporation"`);
        return false;
    }

    if(!exist(_event.shareForCorporation) && typeof _event.shareForCorporation !== "boolean") {
        _sendError(_connectionId, _responseId, `Invalid parameter "shareForCorporation"`);
        return false;
    }

    if(!exist(_event.shareForAlliance) && typeof _event.shareForAlliance !== "boolean") {
        _sendError(_connectionId, _responseId, `Invalid parameter "shareForAlliance"`);
        return false;
    }

    if(!exist(_event.characterId) && typeof _event.characterId !== "number") {
        _sendError(_connectionId, _responseId, `Invalid parameter "characterId"`);
        return false;
    }

    return true;
}

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveMapAddFast",
    });
};

module.exports = request;