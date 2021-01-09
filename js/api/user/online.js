const subscriber = async function (_connectionId, _responseId, _event) {
    core.userController.subscribeOnline(_connectionId, _responseId);

    api.send(_connectionId, _responseId, {
        data: api.connectionsCount(),
        success: true,
        eventType: "responseUserOnline"
    });
};

subscriber.unsubscribe = function (_connectionId, _responseId, _event) {
    core.mapController.get(_event.mapId).unsubscribeExistence(_connectionId, _responseId);
};

module.exports = subscriber;