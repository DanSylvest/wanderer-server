/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var _sendError = function (_connectionId, _responseId, _message, _data) {
    api.send(_connectionId, _responseId, {
        errData: _data,
        success: false,
        message: _message,
        eventType: "responseEveMapInfo",
    });
};


var request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    var token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if (token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    try {
        await core.tokenController.checkToken(token);

        var info = await core.mapController.getMapInfo(_event.mapId);

        api.send(_connectionId, _responseId, {
            data: info,
            success: true,
            eventType: "responseEveMapInfo"
        });
    } catch (_err) {
        _sendError(_connectionId, _responseId, "Error on getMapInfo", _err);
    }
};

module.exports = request;