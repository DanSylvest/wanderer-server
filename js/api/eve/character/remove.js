/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveCharacterRemove",
    });
};

var request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    var token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    try {
        var userId = await core.tokenController.checkToken(token);


        await core.charactersController.removeCharacter(userId, _event.characterId);

        // а так же надо удалить объект персонажа, который отслеживает его действия

        api.send(_connectionId, _responseId, {
            eventType: "responseEveCharacterRemove",
            success: true
        });
    } catch (_err) {
        _sendError(_connectionId, _responseId, _err.message);
    }
};

module.exports = request;