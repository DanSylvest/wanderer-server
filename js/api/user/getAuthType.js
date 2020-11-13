/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */
const exist = require("./../../env/tools/exist")

/**
 *
 * @param _connection_id
 * @param _response_id
 * @param _event {{}}
 * @param _event.token {string}
 * @returns {Promise<void>}
 */
var request = async function (_connection_id, _response_id, _event) {
    if(!exist(_event.token) || typeof _event.token !== "string") {
        api.send(_connection_id, _response_id, {
            message: "Not found parameter 'type' or incorrect.",
            event_type: "responseAuthType",
            success: false
        });
        return
    }

    try {
        let type = await core.tokenController.checkToken(_event.token);
        await core.tokenController.removeToken(_event.token);
        api.send(_connection_id, _response_id, {
            type: type,
            event_type: "responseAuthType",
            success: true
        });

    } catch (_err) {
        api.send(_connection_id, _response_id, {
            err: _err,
            message: "Error on get token",
            event_type: "responseAuthType",
            success: false
        });
    }
};

module.exports = request;