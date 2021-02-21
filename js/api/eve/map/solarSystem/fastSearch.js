/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

const helpers = require("./../../../../utils/helpers.js");
const responseName = "responseFastSearchSolarSystem";

const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    const token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        await core.tokenController.checkToken(token);
        let result = await core.mapController.searchSolarSystems(_event.match);

        api.send(_connectionId, _responseId, {
            result: result,
            eventType: responseName,
            success: true
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on fast search solar system", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;