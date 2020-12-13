/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var _sendError = function (_connectionId, _responseId, _message, _data) {
    api.send(_connectionId, _responseId, {
        errData: _data,
        success: false,
        message: _message,
        eventType: "responseEveMapSystemRemove",
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

        let map = core.mapController.get(_event.mapId);

        try {
            await map.addManual(_event.solarSystemId, _event.x, _event.y);
        } catch (errMsg) {
            _sendError(_connectionId, _responseId, errMsg);
        }
        // await Promise.all(_event.systemIds.map(x => map.systemRemove(x.toString())));

        api.send(_connectionId, _responseId, {
            success: true,
            eventType: "responseEveMapSystemRemove"
        });
    } catch (_err) {
        _sendError(_connectionId, _responseId, "Error on getMapSystemInfo", _err);
    }
};

module.exports = request;