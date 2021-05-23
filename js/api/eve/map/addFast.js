/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("./../../../utils/helpers.js");
const responseName = "responseEveMapAddFast";
// const exist = require("./../../../env/tools/exist");

/**
 * @param _connectionId
 * @param _responseId
 * @param {Object} _event
 * @param {String} _event.name
 * @param {String} _event.description
 * @param {Boolean} _event.shareForCorporation
 * @param {Boolean} _event.shareForAlliance
 * @param {Number} _event.characterId
 * @returns {*}
 */
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
            shareForCorporation: _event.shareForCorporation,
            shareForAlliance: _event.shareForAlliance,
            characterId: _event.characterId
        };

        let result = await core.mapController.createMapFast(userId, props);
        result.owner = userId;

        api.send(_connectionId, _responseId, {
            data: result,
            eventType: responseName,
            success: true
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on fast creating map", {
            code: 0,
            handledError: err
        });
    }
};

// const checkTypes = function (_connectionId, _responseId, _event) {
//     if(!exist(_event.name) && typeof _event.name !== "string") {
//         _sendError(_connectionId, _responseId, `Invalid parameter "name"`);
//         return false;
//     }
//
//     if(!exist(_event.description) && typeof _event.description !== "string") {
//         _sendError(_connectionId, _responseId, `Invalid parameter "shareForCorporation"`);
//         return false;
//     }
//
//     if(!exist(_event.shareForCorporation) && typeof _event.shareForCorporation !== "boolean") {
//         _sendError(_connectionId, _responseId, `Invalid parameter "shareForCorporation"`);
//         return false;
//     }
//
//     if(!exist(_event.shareForAlliance) && typeof _event.shareForAlliance !== "boolean") {
//         _sendError(_connectionId, _responseId, `Invalid parameter "shareForAlliance"`);
//         return false;
//     }
//
//     if(!exist(_event.characterId) && typeof _event.characterId !== "number") {
//         _sendError(_connectionId, _responseId, `Invalid parameter "characterId"`);
//         return false;
//     }
//
//     return true;
// }

// var _sendError = function (_connectionId, _responseId, _message) {
//     api.send(_connectionId, _responseId, {
//         success: false,
//         message: _message,
//         eventType: "responseEveMapAddFast",
//     });
// };

module.exports = request;