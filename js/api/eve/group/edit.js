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
        await core.tokenController.checkToken(token);
        let props = {
            name: _event.name,
            description: _event.description,
            characters: _event.characters,
            corporations: _event.corporations,
            alliances: _event.alliances
        };

        await core.groupsController.editGroup(_event.groupId, props);

        api.send(_connectionId, _responseId, {
            eventType: "responseEveGroupEdit",
            success: true
        });
    } catch (err) {
        _sendError(_connectionId, _responseId, "Error on edit group");
    }
};

const _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveGroupEdit",
    });
};

module.exports = request;