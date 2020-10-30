/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var _sendError = function (_connectionId, _responseId, _message, _data) {
    api.send(_connectionId, _responseId, {
        errData: _data,
        success: false,
        message: _message,
        eventType: "responseEveMapLinkInfo",
    });
};

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event {Object}
 * @param _event.linkIds {Array<String>}
 * @param _event.mapId {String}
 * @returns {Promise<void>}
 */
var request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    var token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if (token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    try {
        // todo
        var userId = await core.tokenController.checkToken(token);
        var map = core.mapController.get(_event.mapId);
        var result = await Promise.all(_event.linkIds.map(_linkId => map.getLinkInfo(_linkId)));

        // var info = await core.mapController.get(_event.mapId).getLinkInfo(_event.linkIds);

        api.send(_connectionId, _responseId, {
            result: result,
            success: true,
            eventType: "responseEveMapLinkInfo"
        });
    } catch (_err) {
        _sendError(_connectionId, _responseId, "Error on getMapLinkInfo", _err);
    }
};

module.exports = request;