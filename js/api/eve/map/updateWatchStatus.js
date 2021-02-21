/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

const exist = require("./../../../env/tools/exist");
const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveMapSetWatchStatus";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event {Object}
 * @param _event.mapId {string}
 * @param _event.status {boolean}
 */
const request = async function (_connectionId, _responseId, _event) {
    if(!exist(_event.mapId) && typeof _event.mapId !== "string") {
        helpers.errResponse(_connectionId, _responseId, responseName, `Invalid parameter "mapId"`, {code: -1});
        return;
    }

    if(!exist(_event.status) && typeof _event.status !== "boolean") {
        helpers.errResponse(_connectionId, _responseId, responseName, `Invalid parameter "status"`, {code: -1});
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
        await core.mapController.setMapWatchStatus(_connectionId, userId, _event.mapId, _event.status);
        api.send(_connectionId, _responseId, {
            eventType: responseName,
            success: true
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on update watch status", {
            code: 0,
            handledError: err
        });
    }
};


module.exports = request;