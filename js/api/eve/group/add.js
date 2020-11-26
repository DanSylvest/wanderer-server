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
        let groupId = await core.groupsController.createGroup(userId, _event);
        api.send(_connectionId, _responseId, {
            groupId: groupId,
            userId: userId,
            eventType: "responseEveGroupAdd",
            success: true
        });
    } catch (err) {
        _sendError(_connectionId, _responseId, "Error on create group");
    }
};

const _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveGroupAdd",
    });
};

module.exports = request;