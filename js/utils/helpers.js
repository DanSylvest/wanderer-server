/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 2/14/21.
 */

const errResponse = function (connectionId, responseId, eventType, message, data) {
    api.send(connectionId, responseId, {
        error: { message, data },
        success: false,
        eventType: eventType,
    });
};

module.exports = {errResponse};