/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveChainAdd";
/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.mapId
 * @param _event.sourceSolarSystemId
 * @param _event.targetSolarSystemId
 * @returns {Promise<void>}
 */
var request = async function (_connectionId, _responseId, _event) {
    if(!_event.sourceSolarSystemId || !_event.targetSolarSystemId) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on create chain", {
            code: 0
        });
        return;
    }

    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        let userId = await core.tokenController.checkToken(token);

        await core.mapController.addChainManual(userId, _event.mapId, _event.sourceSolarSystemId, _event.targetSolarSystemId);

        api.send(_connectionId, _responseId, {
            eventType: responseName,
            success: true
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on create chain", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;