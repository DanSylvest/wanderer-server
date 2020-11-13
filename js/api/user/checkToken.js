/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var log    = require("./../../utils/log");
var printf = require("./../../env/tools/print_f");

var request = async function (_connection_id, _response_id, _event) {
    try {
        var userId = await core.tokenController.checkToken(_event.token);
        core.connectionStorage.set(_connection_id, _event.token);

        await core.userController.setOnline(userId, true)
        log(log.INFO, printf("User [%s] was logged on server.", userId));
        await core.mapController.userOnline(userId);

        api.send(_connection_id, _response_id, {
            event_type: "responseCheckToken",
            success: true
        });
    } catch (_err) {
        api.send(_connection_id, _response_id, {
            message: "Error on check token",
            event_type: "responseCheckToken",
            success: false
        });
    }
};

module.exports = request;