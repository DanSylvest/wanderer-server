/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */

const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveGroupList";

const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    const token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if (token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        const userId = await core.tokenController.checkToken(token);
        const list = await core.groupsController.getGroupsByOwner(userId);
        const listByManager = await core.groupsController.getGroupsByManager(userId);
        const out = [...new Set([...list, ...listByManager])]; // dedupe

        api.send(_connectionId, _responseId, {
            data: out,
            success: true,
            eventType: responseName,
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on load group list", {
            code: 0,
            handledError: err,
        });
    }
};

module.exports = request;