/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveMapInfo";
const {checkAccessToMapByUser} = require('./../../../core/maps/utils/checkAccessToMapByUser');

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.mapId
 * @returns {Promise<void>}
 */
const request = async function (_connectionId, _responseId, _event) {
    const {mapId} = _event;

    // we need get token by connection
    const token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if (token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        const userId = await core.tokenController.checkToken(token);

        const hasAccess = await checkAccessToMapByUser(userId, mapId);
        if (!hasAccess) {
            helpers.errResponse(
                _connectionId, _responseId, responseName,
                `User '${userId}' has no access to map '${mapId}'`,
                {code: 2},
            );
            return;
        }

        const {id, name, description, personalNote: note, hubs} = await core.mapController.getMapInfo(mapId);

        api.send(_connectionId, _responseId, {
            data: {id, name, description, note, hubs},
            success: true,
            eventType: responseName,
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on getting map info", {
            code: 0,
            handledError: err,
        });
    }
};

module.exports = request;