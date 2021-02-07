/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

const _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveCharacterOnline",
    });
};

const subscriber = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    try {
        let userId = await core.tokenController.checkToken(token);
        let userCharacters = await core.userController.getUserCharacters(userId);

        // we need check, if user has had such characterId
        if (userCharacters.indexOf(_event.characterId) === -1) {
            _sendError(_connectionId, _responseId, "You have not permission for this operation.");
            return;
        }

        let isOnline = await core.dbController.charactersDB.get(_event.characterId, "online");

        core.charactersController.get(_event.characterId).get("online").subscribe(_connectionId, _responseId);

        api.send(_connectionId, _responseId, {
            data: isOnline,
            success: true,
            eventType: "responseEveCharacterOnline"
        });
    } catch (e) {
        _sendError(_connectionId, _responseId, JSON.stringify(e));
    }
};

subscriber.unsubscribe = function (_connectionId, _responseId, _event) {
    core.charactersController.get(_event.characterId).get("online").unsubscribe(_connectionId, _responseId);
};


module.exports = subscriber;