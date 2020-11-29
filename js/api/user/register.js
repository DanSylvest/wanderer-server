/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var request = async function (_connection_id, _response_id, _event) {
    try {
        // eve sso
        var token = await core.userController.registerUserByEveSSO(_event.code);

        api.send(_connection_id, _response_id, {
            token: token,
            eventType: "responseRegisterUser",
            success: true
        });

    } catch(_err) {
        api.send(_connection_id, _response_id, {
            err: _err,
            message: _err.message,
            eventType: "responseRegisterUser",
            success: false
        });
    }
};

module.exports = request;