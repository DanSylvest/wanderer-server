/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */
const helpers = require("./../../utils/helpers.js");
const responseName = "responseRegisterUser";
const request = async function (_connectionId, _responseId, _event) {
    try {
        // eve sso
        const token = await core.userController.registerUserByEveSSO(_event.code);

        api.send(_connectionId, _responseId, {
            token: token,
            eventType: responseName,
            success: true
        });

    } catch(err) {
        helpers.errResponse(_connectionId, _responseId, responseName, "Error on register", {
            code: 0,
            handledError: err
        });
    }
};

module.exports = request;