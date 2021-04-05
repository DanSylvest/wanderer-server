/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveCharacterRemove";

const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        var userId = await core.tokenController.checkToken(token);

        await core.charactersController.removeCharacter(userId, _event.characterId);

        api.send(_connectionId, _responseId, {
            eventType: responseName,
            success: true
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on remove character", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;