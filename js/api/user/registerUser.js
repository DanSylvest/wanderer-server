/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var request = async function (_connection_id, _response_id, _event) {
    try {
        // this is mail+password
        if(_event.type === 0) {
            await core.userController.registerUserByMailAndPassword({
                mail: _event.mail,
                password: _event.password,
            });

            api.send(_connection_id, _response_id, {
                eventType: "responseRegisterUser",
                success: true
            });
        }

        // eve sso
        if(_event.type === 1) {
            var token = await core.userController.registerUserByEveSSO({
                code: _event.code
            });

            api.send(_connection_id, _response_id, {
                token: token,
                eventType: "responseRegisterUser",
                success: true
            });
        }

    } catch(_err) {
        api.send(_connection_id, _response_id, {
            message: _err.message,
            eventType: "responseRegisterUser",
            success: false
        });
    }
};

module.exports = request;