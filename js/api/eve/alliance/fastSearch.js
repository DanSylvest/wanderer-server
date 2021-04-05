/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */

const helpers = require("./../../../utils/helpers.js");

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.match
 * @returns {Promise<void>}
 */
var request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if (token === undefined) {
        helpers.errResponse(_connectionId, _responseId, "responseEveAllianceFastSearch", "You not authorized or token was expired", {code: 1});
        return;
    }

    if (!core.eveServer.isOnline()) {
        helpers.errResponse(_connectionId, _responseId, "responseEveAllianceFastSearch", "TQ is offline", {code: 1001});
        return;
    }

    try {
        let userId = await core.tokenController.checkToken(token);

        if (!core.eveServer.isOnline()) {
            helpers.errResponse(_connectionId, _responseId, "responseEveAllianceFastSearch", "TQ is offline", {code: 1001});
            return;
        }

        let result = await core.alliancesController.fastSearch({userId: userId, match: _event.match});

        api.send(_connectionId, _responseId, {
            result: result,
            eventType: "responseEveAllianceFastSearch",
            success: true
        });
    } catch (_err) {
        helpers.errResponse(_connectionId, _responseId, "responseEveAllianceFastSearch", "Error on fast search", {
            code: 0,
            handledError: _err
        });
    }
};

module.exports = request;