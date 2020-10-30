/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveAllianceFastSearch",
    });
};

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.match
 * @returns {Promise<void>}
 */
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
        var result = await core.alliancesController.fastSearch({userId: userId, match: _event.match});
        api.send(_connectionId, _responseId, {
            result: result,
            eventType: "responseEveAllianceFastSearch",
            success: true
        });
    } catch (_err) {
        _sendError(_connectionId, _responseId, "Error on fast search");
    }
};

module.exports = request;