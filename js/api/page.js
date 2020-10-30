var log    = require("./../utils/log");
var printf = require("./../env/tools/print_f");

var isProtect = function (_connection_id, _response_id, _event) {
    var isProtect = core.pageController.isProtected(_event.pageName);

    log(log.DEBUG, printf("Check page protect [%s]", _event.pageName));

    api.send(_connection_id, _response_id, {
        eventType: "responseComponentIsProtect",
        protected: isProtect,
        success: true
    });
};

var load = function (_connection_id, _response_id, _event) {
    // when page is protected
    if(core.pageController.isProtected(_event.pageName)) {
        log(log.DEBUG, printf("Load protected page: [%s] - connectionId [%s]", _event.pageName, _connection_id));

        // we need get a token by connection
        var token = core.connectionStorage.get(_connection_id);

        // when token is undefined - it means what you have no rights
        if(token === undefined) {
            log(log.DEBUG, printf("Load protected page: [%s] - connectionId [%s] - token is undefined", _event.pageName, _connection_id));

            api.send(_connection_id, _response_id, {
                eventType: "responseLoadPage",
                message: "Page can not be loaded when you have no rights [1]",
                error: 404,
                success: false
            });

            return;
        }

        // we need check token valid
        core.tokenController.checkToken(token).then(function(_value) {
            var page = core.pageController.get(_event.pageName); // todo component can be !!undefined

            api.send(_connection_id, _response_id, {
                eventType: "responseLoadPage",
                page: page,
                success: true
            });
        }.bind(this), function(_err) {
            log(log.DEBUG, printf("Load protected page: [%s] - connectionId [%s] - token [%s] is broken", _event.pageName, _connection_id, token));

            api.send(_connection_id, _response_id, {
                eventType: "responseLoadPage",
                errorObj: _err,
                message: "Page can not be loaded when you have no rights [2]",
                error: 404,
                success: false
            });
        }.bind(this));
    } else {
        log(log.DEBUG, printf("Load public page: [%s] - connectionId [%s]", _event.pageName, _connection_id));

        // when component is public
        var page = core.pageController.get(_event.pageName); // todo component can be !!undefined

        api.send(_connection_id, _response_id, {
            eventType: "responseLoadPage",
            page: page,
            success: true
        });
    }
};

module.exports = {
    load: load,
    isProtect: isProtect,
};