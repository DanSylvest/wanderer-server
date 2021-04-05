/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */

const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveMapWaypoint";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.type
 * @param _event.characterId
 * @param _event.destinationSolarSystemId
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

    try {
        await core.tokenController.checkToken(token);
        core.charactersController.get(_event.characterId).waypoint.set(_event.type, _event.destinationSolarSystemId)

        api.send(_connectionId, _responseId, {
            success: true,
            eventType: responseName
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on set Waypoint", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;