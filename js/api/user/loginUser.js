/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */
var log    = require("./../../utils/log");
var printf = require("./../../env/tools/print_f");

var request = async function (_connection_id, _response_id, _event) {
    try {
        var token = await core.userController.loginUserByMailAndPassword({
            mail: _event.mail,
            password: _event.password,
        });

        // core.connectionStorage.set(_connection_id, token);

        var userId = await core.tokenController.checkToken(token);

        await core.userController.setOnline(userId, true);

        log(log.INFO, printf("User [%s] was logged on server.", userId));

        api.send(_connection_id, _response_id, {
            token: token,
            event_type: "responseLoginUser",
            success: true
        });

    } catch (_err) {
        api.send(_connection_id, _response_id, {
            message: "Error on setting online",
            event_type: "responseLoginUser",
            success: false
        });
    }
};

module.exports = request;