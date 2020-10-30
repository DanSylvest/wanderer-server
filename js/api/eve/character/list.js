/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */
var printf        = require("./../../../env/tools/print_f");
var CustomPromise = require("./../../../env/promise");
var DBController  = require("./../../../core/dbController");

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveCharacterList",
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
    var userCharacters = [];

    // we need check token valid
    core.tokenController.checkToken(token).then(function(_value) {
        userId = _value;

        return core.userController.getUserCharacters(userId);
    }.bind(this), function() {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
    }.bind(this)).then(function(_characters){
        userCharacters = _characters;

        var prarr = [];

        // we need obtain information about each user
        for (var a = 0; a < _characters.length; a++) {
            prarr.push(core.charactersController.get(_characters[a]).getInfo());
        }

        return Promise.all(prarr)
    }.bind(this), function(_error){
        _sendError(_connectionId, _responseId, printf("Error on load characters for user - %s", userId));
    }.bind(this)).then(function(_charactersInfoArr){
        for (var a = 0; a < _charactersInfoArr.length; a++) {
            _charactersInfoArr[a].id = userCharacters[a];
        }

        api.send(_connectionId, _responseId, {
            data: _charactersInfoArr,
            success: true,
            eventType: "responseEveCharacterList"
        });

    }.bind(this), function(_error){
        _sendError(_connectionId, _responseId, printf("Error on load characters for user - %s", userId));
    }.bind(this));

};

module.exports = request;