/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    try {
        let userId = await core.tokenController.checkToken(token);
        let maps = await core.mapController.getMapsWhereCharacterTrackByUser(userId);

        api.send(_connectionId, _responseId, {
            list: maps,
            success: true,
            eventType: "responseEveAllowedMaps"
        });

    } catch (_err) {
        debugger;
        _sendError(_connectionId, _responseId, "Error on getAllowedMapsByUser", _err);
    }
};

const _sendError = function (_connectionId, _responseId, _message, _data) {
    api.send(_connectionId, _responseId, {
        errData: _data,
        success: false,
        message: _message,
        eventType: "responseEveAllowedMaps",
    });
};

module.exports = request;