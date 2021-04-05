/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("./../../../../utils/helpers.js");
const responseName = "responseEveMapSystemInfo";

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

        let info = await core.mapController.get(_event.mapId).getSystemInfo(_event.systemId);

        api.send(_connectionId, _responseId, {
            data: info,
            success: true,
            eventType: responseName
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on get solar system info", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;