/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("./../../utils/helpers.js");
const responseName = "responseAuthType";

const request = async function (_connectionId, _responseId, _event) {
    try {
        await core.tokenController.checkToken(_event.token);
        await core.userController.updateUserOnlineStatus(_connectionId, _event.token);

        api.send(_connectionId, _responseId, {
            event_type: responseName,
            success: true
        });
    } catch (err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on check token", {
            code: 0,
            handledError: err
        })
    }
};

module.exports = request;