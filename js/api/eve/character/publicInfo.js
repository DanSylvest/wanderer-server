const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveCharacterInfo";

const request = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    let token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if (token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        if (!core.eveServer.isOnline()) {
            helpers.errResponse(_connectionId, _responseId, responseName, "TQ is offline", {code: 1001});
            return;
        }

        let info;
        if (_event.characterIds) {
            info = await Promise.all(_event.characterIds.map(id => core.charactersController.getPublicCharacterInfo(id)));
            _event.characterIds.map((x, i) => info[i].id = x.toString());
        } else if (_event.characterId) {
            info = await core.charactersController.getPublicCharacterInfo(_event.characterId);
        }

        api.send(_connectionId, _responseId, {
            result: info,
            success: true,
            eventType: responseName
        })
    } catch (_err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on load character info", {
            code: 0,
            handledError: _err
        });
    }
};

module.exports = request;