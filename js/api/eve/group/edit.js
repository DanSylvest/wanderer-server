/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveGroupEdit",
    });
};

var request = function (_connectionId, _responseId, _event) {
    // we need get token by connection
    var token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    var userId = null;

    core.tokenController.checkToken(token).then(function(_value) {
        userId = _value;

        // log(log.INFO, printf("SSO_AUTH[1]: inner token success for user [%s]", _value));
        var props = {
            name: _event.name,
            description: _event.description,
            characters: _event.characters,
            corporations: _event.corporations,
            alliances: _event.alliances
        };

        return core.groupsController.editGroup(_event.groupId, props);
    }.bind(this), function() {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
    }.bind(this))

    .then(function(_event){
        api.send(_connectionId, _responseId, {
            eventType: "responseEveGroupEdit",
            success: true
        });
    }.bind(this), function(_err){
        // need log it
        debugger;
        _sendError(_connectionId, _responseId, "Error on edit group");
    }.bind(this))

};

module.exports = request;