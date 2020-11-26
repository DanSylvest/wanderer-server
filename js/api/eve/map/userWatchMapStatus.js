/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

const exist = require("./../../../env/tools/exist");

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event {Object}
 * @param _event.mapId {string}
 * @param _event.status {boolean}
 */
const request = async function (_connectionId, _responseId, _event) {
    if(!exist(_event.mapId) && typeof _event.mapId !== "string") {
        _sendError(_connectionId, _responseId, `Invalid parameter "mapId"`);
        return;
    }

    if(!exist(_event.status) && typeof _event.status !== "boolean") {
        _sendError(_connectionId, _responseId, `Invalid parameter "status"`);
        return;
    }

    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    try {
        let userId = await core.tokenController.checkToken(token);
        await core.mapController.setMapWatchStatus(_connectionId, userId, _event.mapId, _event.status);
        api.send(_connectionId, _responseId, {
            eventType: "responseEveMapSetWatchStatus",
            success: true
        });
    } catch (_err) {
        _sendError(_connectionId, _responseId, `Error on set map on watch status '${_event.mapId}' - ${_event.status}.`);
    }
};

const _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveMapSetWatchStatus",
    });
};

module.exports = request;