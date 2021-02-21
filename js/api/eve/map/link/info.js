/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */
const helpers = require("./../../../../utils/helpers.js");
const responseName = "responseEveMapLinkInfo";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event {Object}
 * @param _event.linkIds {Array<String>}
 * @param _event.mapId {String}
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
        let map = core.mapController.get(_event.mapId);
        let result = await Promise.all(_event.linkIds.map(_linkId => map.getLinkInfo(_linkId)));

        api.send(_connectionId, _responseId, {
            result: result,
            success: true,
            eventType: responseName
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on load link info", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;