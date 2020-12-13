/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var _sendError = function (_connectionId, _responseId, _message) {
    api.send(_connectionId, _responseId, {
        success: false,
        message: _message,
        eventType: "responseEveCorporationFastSearch",
    });
};

var request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
        return;
    }

    try {
        await core.tokenController.checkToken(token);
        let result = await core.mapController.searchSolarSystems(_event.match);

        // let re
        // debugger;
        // let searchResult = await core.corporationsController.fastSearch({
        //     userId: userId,
        //     match: _event.match
        // });
        api.send(_connectionId, _responseId, {
            result: result,
            eventType: "responseEveSolarSystemsFastSearch",
            success: true
        });
    } catch (e) {
        _sendError(_connectionId, _responseId, "You not authorized or token was expired");
    }
};

module.exports = request;