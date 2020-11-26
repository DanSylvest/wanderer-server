/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

const request = async function (_connection_id, _response_id, _event) {
    try {
        await core.tokenController.checkToken(_event.token);
        await core.userController.updateUserOnlineStatus(_connection_id, _event.token);

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