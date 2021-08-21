/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */

const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveCharacterList";

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
        let arr = await Promise.all(characters.map(x => core.charactersController.getProtectedCharacterInfo(x)));
        arr.map((x, i) => arr[i].id = characters[i]);

        api.send(_connectionId, _responseId, {
            data: arr,
            success: true,
            eventType: responseName
        });

    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on load characters list info", {
            code: 0,
            handledError: err
        });
    }

};

module.exports = request;