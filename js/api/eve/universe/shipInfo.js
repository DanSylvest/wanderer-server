const helpers = require("./../../../utils/helpers.js");
const exist = require("./../../../env/tools/exist");
const responseName = "responseShipInfo";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.shipId
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

        let result = await core.sdeController.getShipTypeInfo(_event.shipId);
        if (exist(result)) {
            api.send(_connectionId, _responseId, {
                data: result,
                success: true,
                eventType: responseName
            });
        } else {
            helpers.errResponse(_connectionId, _responseId, responseName, `Ship [${_event.shipId}] is not exists.`, {
                code: 0
            });
        }

    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on getting ship info", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;