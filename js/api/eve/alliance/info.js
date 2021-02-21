/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

const helpers = require("./../../../utils/helpers.js");

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.allianceId
 * @param _event.type * @returns {Promise<void>}
 */
const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if (token === undefined) {
        helpers.errResponse(_connectionId, _responseId, "responseEveAllianceFastSearch", "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        await core.tokenController.checkToken(token);

        if (!core.eveServer.isOnline()) {
            helpers.errResponse(_connectionId, _responseId, "responseEveAllianceInfo", "TQ is offline", {code: 1001});
            return;
        }

        let info = await core.alliancesController.getInfo(_event.allianceId);

        api.send(_connectionId, _responseId, {
            result: info,
            success: true,
            eventType: "responseEveAllianceInfo"
        });
    } catch (_err) {
        helpers.errResponse(_connectionId, _responseId, "responseEveAllianceInfo", "Error on load char info", {
            code: 0,
            handledError: _err
        });
    }
};

module.exports = request;