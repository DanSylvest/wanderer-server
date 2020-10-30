var printf  = require("./../../../env/tools/print_f");

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveMapSystems",
    });
};

var subscriber = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    var token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    //todo
    var userId = await core.tokenController.checkToken(token);

    var linkIds = await core.mapController.get(_event.mapId).getLinks();

    core.mapController.get(_event.mapId).subscribeLinks(_connectionId, _responseId);

    api.send(_connectionId, _responseId, {
        data: {
            type: "bulk",
            list: linkIds
        },
        success: true,
        eventType: "responseEveMapLinks"
    });
};

subscriber.unsubscribe = function (_connectionId, _responseId, _event) {
    // TODO - maybe we need check all (token, characters e.t., but i thing it not need now.

    core.mapController.get(_event.mapId).unsubscribeLinks(_connectionId, _responseId);
};


module.exports = subscriber;