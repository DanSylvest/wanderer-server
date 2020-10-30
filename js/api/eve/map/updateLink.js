var _sendError = function (_connectionId, _responseId, _message, _data) {
    api.send(_connectionId, _responseId, {
        errData: _data,
        success: false,
        message: _message,
        eventType: "responseEveMapLinkUpdate",
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
        await core.mapController.get(_event.mapId).updateLink(_event.linkId, _event.data);

        api.send(_connectionId, _responseId, {
            success: true,
            eventType: "responseEveMapLinkUpdate"
        });
    } catch (_err) {
        _sendError(_connectionId, _responseId, "Error ", _err);
    }
};

module.exports = request;