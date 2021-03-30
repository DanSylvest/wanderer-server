const helpers = require("./../../../utils/helpers.js");
const responseName = "responseSolarSystemInfo";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.mapId
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

        let result = await core.dbController.solarSystemsTable.getByCondition({
            name: "solarSystemId", operator: "=", value: _event.solarSystemId
        }, core.dbController.solarSystemsTable.attributes());

        if(result.length === 1 )
            api.send(_connectionId, _responseId, {
                data: result[0],
                success: true,
                eventType: responseName
            });
        else
            helpers.errResponse(_connectionId, _responseId, responseName, `Solar system [${_event.solarSystemId}] is not exists.`, {
                code: 0
            });


    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on getting map info", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;