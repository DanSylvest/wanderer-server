const helpers = require("./../../../utils/helpers.js");
const responseName = "responseStaticData";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @returns {Promise<void>}
 */
const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    const token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if (token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    api.send(_connectionId, _responseId, {
        data: {
            effects: core.staticData.effects,
            wormholeClasses: core.staticData.wormholeClasses,
            wormholes: core.staticData.wormholes,
            sunTypes: core.staticData.sunTypes,
        },
        success: true,
        eventType: responseName
    });
};

module.exports = request;