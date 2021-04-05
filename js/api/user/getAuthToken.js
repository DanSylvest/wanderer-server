/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const exist = require("./../../env/tools/exist")

/**
 *
 * @param _connection_id
 * @param _response_id
 * @param _event {{}}
 * @param _event.type {string}
 * @returns {Promise<void>}
 */
var request = async function (_connection_id, _response_id, _event) {
    if(!exist(_event.type) || typeof _event.type !== "string" || !_event.type.match(/auth|attach/i)) {
        api.send(_connection_id, _response_id, {
            message: "Not found parameter 'type' or incorrect. Type should be 'auth' or 'attach'",
            event_type: "responseAuthToken",
            success: false
        });
        return
    }

    try {
        let token = await core.tokenController.generateToken(_event.type, +new Date + 1000 * 60 * 30);
        api.send(_connection_id, _response_id, {
            token: token,
            event_type: "responseAuthToken",
            success: true
        });

    } catch (_err) {
        api.send(_connection_id, _response_id, {
            message: "Error on get token",
            event_type: "responseAuthToken",
            success: false
        });
    }
};

module.exports = request;