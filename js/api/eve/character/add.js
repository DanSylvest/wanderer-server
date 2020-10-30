/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */
var log           = require("./../../../utils/log");
var printf        = require("./../../../env/tools/print_f");
var extend        = require("./../../../env/tools/extend");
var CustomPromise = require("./../../../env/promise");

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveCharacterAdd",
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

    var userId = "";
    core.tokenController.checkToken(token).then(function(_value) {
        userId = _value;

        return core.userController.addCharacter(userId, _event.code);
    }.bind(this), function() {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
    }.bind(this)).then(function () {
        api.send(_connectionId, _responseId, {
            success: true,
            eventType: "responseEveCharacterAdd"
        });
    }.bind(this),function(_err) {
        _sendError(_connectionId, _responseId, JSON.stringify(_err, true, 3));
    }.bind(this));

};

module.exports = request;