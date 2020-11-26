const subscriber = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    let userId = await core.tokenController.checkToken(token);
    await core.mapController.subscribeAllowedMaps(userId, _connectionId, _responseId);

};

subscriber.unsubscribe = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    let userId = await core.tokenController.checkToken(token);

    await core.mapController.unsubscribeAllowedMaps(userId, _connectionId, _responseId);
};

const sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveSubscriptionAllowedMaps",
    });
};

module.exports = subscriber;