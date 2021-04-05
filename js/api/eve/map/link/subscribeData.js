const helpers = require("./../../../../utils/helpers.js");
const responseName = "responseEveMapChainData";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.mapId
 * @param _event.chainId
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
        let map = core.mapController.get(_event.mapId);
        let chain = await map.getChain(_event.chainId);
        await chain.subscribeDynamicInfo(_connectionId, _responseId);
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on subscribe chain data", {
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
        await core.tokenController.checkToken(token);
        let map = core.mapController.get(_event.mapId);
        let chain = await map.getChain(_event.chainId);
        await chain.unsubscribeDynamicInfo(_connectionId, _responseId);
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on unsubscribe chain data", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = subscriber;