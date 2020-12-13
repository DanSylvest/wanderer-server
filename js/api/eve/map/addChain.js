/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveChainAdd",
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

        await core.mapController.addChainManual(userId, _event.mapId, _event.sourceSolarSystemId, _event.targetSolarSystemId);

        // let props = {
        //     name: _event.name,
        //     description: _event.description,
        //     groups: _event.groups
        // };

        // let mapIdPr = core.mapController.createMap(userId, props);
        // let userNamePr = core.userController.getUserName(userId);
        // let mapId = await mapIdPr;
        // let userName = await userNamePr;

        api.send(_connectionId, _responseId, {
            eventType: "responseEveChainAdd",
            success: true
        });
    } catch (_err) {
        _sendError(_connectionId, _responseId, "Error on create map");
    }
};

module.exports = request;