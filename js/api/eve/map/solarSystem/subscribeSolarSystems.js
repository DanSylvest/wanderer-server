const helpers = require("./../../../../utils/helpers.js");
const responseName = "responseEveMapSystems";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.mapId
 * @returns {Promise<void>}
 */
const subscriber = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    const token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        await core.tokenController.checkToken(token);

        await core.mapController.get(_event.mapId).subscribers.subscribeSystems(_connectionId, _responseId);
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on remove solar system", {
            code: 0,
            handledError: err
        });
    }
};

subscriber.unsubscribe = function (_connectionId, _responseId, _event) {
    // TODO - maybe we need check all (token, characters e.t., but i thing it not need now.

    core.mapController.get(_event.mapId).subscribers.unsubscribeSystems(_connectionId, _responseId);
};


module.exports = subscriber;