/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */
const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveMapAdd";

const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    const token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        let userId = await core.tokenController.checkToken(token);
        let props = {
            name: _event.name,
            description: _event.description,
            groups: _event.groups
        };

        let mapIdPr = core.mapController.createMap(userId, props);
        let userNamePr = core.userController.getUserName(userId);
        let mapId = await mapIdPr;
        let userName = await userNamePr;

        api.send(_connectionId, _responseId, {
            data: {
                mapId: mapId,
                owner: userName,
            },
            eventType: responseName,
            success: true
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on create map", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;