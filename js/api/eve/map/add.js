/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveMapAdd",
    });
};

var request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    try {
        let userId = await core.tokenController.checkToken(token);
        let props = {
            name: _event.name,
            description: _event.description,
            private: _event.isPrivate,
            groups: _event.groups
        };

        let mapId = await core.mapController.createMap(userId, props);
        api.send(_connectionId, _responseId, {
            mapId: mapId,
            userId: userId,
            eventType: "responseEveMapAdd",
            success: true
        });
    } catch (_err) {
        _sendError(_connectionId, _responseId, "Error on create map");
    }
};

module.exports = request;