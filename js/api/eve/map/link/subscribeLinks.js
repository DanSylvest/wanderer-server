const helpers = require("./../../../../utils/helpers.js");
const responseName = "responseEveMapLinks";

const subscriber = async function (_connectionId, _responseId, _event) {
    // we need get token by connection
    const token = core.connectionStorage.get(_connectionId);

    // when token is undefined - it means what you have no rights
    if (token === undefined) {
        helpers.errResponse(_connectionId, _responseId, responseName, "You not authorized or token was expired", {code: 1});
        return;
    }

    try {
        await core.tokenController.checkToken(token);
        let linkIds = await core.mapController.get(_event.mapId).getLinks();
        core.mapController.get(_event.mapId).subscribeLinks(_connectionId, _responseId);

        api.send(_connectionId, _responseId, {
            data: {
                type: "bulk",
                list: linkIds
            },
            success: true,
            eventType: responseName
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error in subscribe links", {
            code: 1,
            handledError: err
        });
    }
};

subscriber.unsubscribe = function (_connectionId, _responseId, _event) {
    core.mapController.get(_event.mapId).unsubscribeLinks(_connectionId, _responseId);
};

module.exports = subscriber;