/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 2/23/21.
 */

const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveCharactersByUser";

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
        let characters = await core.userController.getUserCharacters(userId);

        api.send(_connectionId, _responseId, {
            data: characters,
            success: true,
            eventType: responseName
        });

    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on load characters list", {
            code: 0,
            handledError: err
        });
    }

};

module.exports = request;