/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */
var printf  = require("./../../../env/tools/print_f");

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveCharacterOnline",
    });
};

var subscriber = function (_connectionId, _responseId, _event) {
    // we need get token by connection
    var token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    var userId = "";
    var userCharacters = [];

    // we need check token valid
    core.tokenController.checkToken(token).then(function(_value) {
        userId = _value;

        return core.userController.getUserCharacters(userId);
    }.bind(this), function() {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
    }.bind(this)).then(function(_characters){
        userCharacters = _characters;

        // we need check, if user has had such characterId
        if(userCharacters.indexOf(_event.characterId) === -1) {
            _sendError(_connectionId, _responseId, "You have not permission for this operation.");
            return;
        }

        // we need load online and subscribe on it
        // return core.charactersController.get(_event.characterId).getAttribute("online");
        return core.dbController.charactersDB.get(_event.characterId, "online");
    }.bind(this), function(){
        _sendError(_connectionId, _responseId, printf("Error on load characters for user - %s", userId));
    }.bind(this)).then(function(_isOnline){

        core.charactersController.get(_event.characterId).get("online").subscribe(_connectionId, _responseId);

        api.send(_connectionId, _responseId, {
            data: _isOnline,
            success: true,
            eventType: "responseEveCharacterOnline"
        });

    }.bind(this), function(){
        _sendError(_connectionId, _responseId, printf("Error on load characters for user - %s", userId));
    }.bind(this));
};

subscriber.unsubscribe = function (_connectionId, _responseId, _event) {
    // TODO - maybe we need check all (token, characters e.t., but i thing it not need now.

    core.charactersController.get(_event.characterId).get("online").unsubscribe(_connectionId, _responseId);
};


module.exports = subscriber;