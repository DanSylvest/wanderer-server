
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
        let list = await core.groupsController.updateAllowedCharactersForGroup(userId, _event.groupId, _event.characters);
        api.send(_connectionId, _responseId, {
            list: list,
            success: true,
            eventType: "responseEveUpdateAllowedCharacterForGroup"
        });
    } catch (err) {
        _sendError(_connectionId, _responseId, "Error on load group list", err);
    }
};

const _sendError = function (_connectionId, _responseId, _message, _data) {
    api.send(_connectionId, _responseId, {
        errData: _data,
        success: false,
        message: _message,
        eventType: "responseEveUpdateAllowedCharacterForGroup",
    });
};

module.exports = request;