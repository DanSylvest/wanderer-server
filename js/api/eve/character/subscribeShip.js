/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */

const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveCharacterShip";

const subscriber = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if(token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        let userId = await core.tokenController.checkToken(token);
        let userCharacters = await core.userController.getUserCharacters(userId);

        // we need check, if user has had such characterId
        if (userCharacters.indexOf(_event.characterId) === -1) {
            helpers.errResponse(_connectionId, _responseId, responseName, "You have not permission for this operation", {code: -1});
            return;
        }

        core.charactersController.get(_event.characterId).get("ship").subscribe(_connectionId, _responseId);
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error in subscribe ship", {code: 1, handledError: err});
    }
};

subscriber.unsubscribe = function (_connectionId, _responseId, _event) {
    core.charactersController.get(_event.characterId).get("ship").unsubscribe(_connectionId, _responseId);
};


module.exports = subscriber;