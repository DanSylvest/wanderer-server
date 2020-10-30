/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveCharacterFastSearch",
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
        var options = {
            userId: userId,
            match: _event.match,
            type: _event.type,
        };

        return core.charactersController.fastSearch(options);
    }.bind(this), function() {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
    }.bind(this))

    .then(function(_result){
        api.send(_connectionId, _responseId, {
            result: _result,
            eventType: "responseEveCharacterFastSearch",
            success: true
        });
    }.bind(this), function(_err){
        // need log it
        _sendError(_connectionId, _responseId, "Error on fast search");
    }.bind(this))

};

module.exports = request;