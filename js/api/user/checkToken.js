/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/20/20.
 */

var log    = require("./../../utils/log");
var printf = require("./../../env/tools/print_f");

var request = async function (_connection_id, _response_id, _event) {
    // var hash = controller.generateToken();

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



    // core.tokenController.checkToken(_event.token).then(function(_value) {
    //     if(_value === _event.login) {
    //         // TODO Думаю, что если все с токеном в порядке, то его следует продлить, на еще один день.
    //         // Т.е. пока пользователь активно пользуется попросту нет смысла его не продлевать...
    //
    //         // we need connect connection_id and token
    //         core.connectionStorage.set(_connection_id, _event.token);
    //
    //         core.userController.setOnline(_value, true).then(function(){
    //             log(log.INFO, printf("User [%s] was logged on server.", _value));
    //             core.mapController.userOnline(_value);
    //             api.send(_connection_id, _response_id, {
    //                 event_type: "responseCheckToken",
    //                 success: true
    //             });
    //         }.bind(this), function(){
    //             // error on setting online
    //             api.send(_connection_id, _response_id, {
    //                 message: "Error on setting online",
    //                 event_type: "responseCheckToken",
    //                 success: false
    //             });
    //         }.bind(this));
    //
    //
    //     } else {
    //         // WTF??
    //         // may be need ban here
    //         // todo invalid login (maybe need remove token?)
    //         api.send(_connection_id, _response_id, {
    //             event_type: "responseCheckToken",
    //             success: false
    //         });
    //     }
    // }.bind(this), function() {
    //     api.send(_connection_id, _response_id, {
    //         event_type: "responseCheckToken",
    //         success: false
    //     });
    // }.bind(this));
};

module.exports = request;