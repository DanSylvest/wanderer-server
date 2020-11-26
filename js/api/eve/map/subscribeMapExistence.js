const subscriber = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    core.mapController.get(_event.mapId).subscribeExistence(_connectionId, _responseId);

    api.send(_connectionId, _responseId, {
        data: true,
        success: true,
        eventType: "responseEveMapExistence"
    });
};

subscriber.unsubscribe = function (_connectionId, _responseId, _event) {
    core.mapController.get(_event.mapId).unsubscribeExistence(_connectionId, _responseId);
};

const sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveMapExistence",
    });
};

module.exports = subscriber;