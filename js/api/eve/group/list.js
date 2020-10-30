/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var _sendError = function (_connectionId, _responseId, _message, _data) {
    api.send(_connectionId, _responseId, {
        errData: _data,
        success: false,
        message: _message,
        eventType: "responseEveGroupList",
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

        return core.groupsController.getGroupListByOwner(userId);
    }.bind(this), function() {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
    }.bind(this))

    .then(function(_list){
        api.send(_connectionId, _responseId, {
            list: _list,
            success: true,
            eventType: "responseEveGroupList"
        });
    }.bind(this), function(_err){
        // need log it
        _sendError(_connectionId, _responseId, "Error on load group list", _err);
    }.bind(this))

};

module.exports = request;