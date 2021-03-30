const helpers = require("./../../../utils/helpers.js");
const responseName = "responseSubscribeAllowedCharacters";

const subscriber = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    const token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        let userId = await core.tokenController.checkToken(token);
        await core.mapController.get(_event.mapId).subscribeAllowedCharacters(_connectionId, _responseId, userId);
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on subscribe allowed characters", {
            code: 0,
            handledError: err
        });
    }
};

subscriber.unsubscribe = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        let userId = await core.tokenController.checkToken(token);
        await core.mapController.get(_event.mapId).unsubscribeAllowedCharacters(_connectionId, _responseId, userId);
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on unsubscribe allowed characters", {
            code: 0,
            handledError: err
        });
    }
};


module.exports = subscriber;