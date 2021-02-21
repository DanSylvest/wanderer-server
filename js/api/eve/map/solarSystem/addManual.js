/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */
const helpers = require("./../../../../utils/helpers.js");
const responseName = "responseEveMapSystemRemove";

const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    const token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if (token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        await core.tokenController.checkToken(token);

        let map = core.mapController.get(_event.mapId);

        await map.addManual(_event.solarSystemId, _event.x, _event.y);

        api.send(_connectionId, _responseId, {
            success: true,
            eventType: responseName
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on add solar system manual", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;