/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

const _sendError = function (_connectionId, _responseId, _message, _data) {
    api.send(_connectionId, _responseId, {
        errData: _data,
        success: false,
        message: _message,
        eventType: "responseEveMapRoutesAddHub",
    });
};

const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if (token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    try {
        await core.tokenController.checkToken(token);
        let map = core.mapController.get(_event.mapId);
        await map.addHub(_event.solarSystemId);

        api.send(_connectionId, _responseId, {
            success: true,
            eventType: "responseEveMapRoutesAddHub"
        });
    } catch (_err) {
        _sendError(_connectionId, _responseId, "Error on getMapLinkInfo", _err);
    }
};

module.exports = request;