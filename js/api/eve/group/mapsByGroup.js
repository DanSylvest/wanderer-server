/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("./../../../utils/helpers.js");
const responseName = "responseMapsByGroup";

const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        await core.tokenController.checkToken(token);
        let mapIds = await core.groupsController.getMapsByGroup(_event.groupId);
        let list = await Promise.all(mapIds.map(x => core.mapController.getMapInfo(x)));

        api.send(_connectionId, _responseId, {
            data: list,
            success: true,
            eventType: responseName
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on loading maps by group", {
            code: 0,
            handledError: err
        });
    }

};

module.exports = request;