/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 2/14/21.
 */

const errResponse = function (connectionId, responseId, eventType, message, data) {
    api.send(connectionId, responseId, {
        error: { message, data },
        success: false,
        eventType: eventType,
    });
};

module.exports = {errResponse};