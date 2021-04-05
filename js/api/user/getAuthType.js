/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const exist = require("./../../env/tools/exist")
const helpers = require("./../../utils/helpers.js");
const responseName = "responseAuthType";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event {{}}
 * @param _event.token {string}
 * @returns {Promise<void>}
 */
var request = async function (_connectionId, _responseId, _event) {
    if(!exist(_event.token) || typeof _event.token !== "string") {
        helpers.errResponse(_connectionId, _responseId, responseName, "Not found parameter 'token' or incorrect", {code: 0})
        return
    }

    try {
        let type = await core.tokenController.checkToken(_event.token);
        await core.tokenController.removeToken(_event.token);
        api.send(_connectionId, _responseId, {
            type: type,
            event_type: responseName,
            success: true
        });

    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on get auth type", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;