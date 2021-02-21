/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */
const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveGroupEdit";

const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        let userId = await core.tokenController.checkToken(token);

        if (!core.eveServer.isOnline()) {
            helpers.errResponse(_connectionId, _responseId, responseName, "TQ is offline", {code: 1001});
            return;
        }

        let list = await core.groupsController.getAllowedCharactersForGroupByUser(_event.groupId, userId);

        api.send(_connectionId, _responseId, {
            data: list,
            success: true,
            eventType: responseName
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on load group allowed characters", {
            code: 0,
            handledError: err
        });
    }

};

module.exports = request;