
var isProtect = function (_connection_id, _response_id, _event) {
    // var hash = controller.generateToken();
    var isProtect = core.componentController.isProtected(_event.componentName);

    api.send(_connection_id, _response_id, {
        eventType: "responseComponentIsProtect",
        protected: isProtect,
        success: true
    });
};

var load = function (_connection_id, _response_id, _event) {
    // when component is protected
    if(core.componentController.isProtected(_event.componentName)) {
        // we need get token by connection
        var token = core.connectionStorage.get(_connection_id);

        // when token is undefined - it means what you have no rights
        if(token === undefined) {
            api.send(_connection_id, _response_id, {
                eventType: "responseComponentLoad",
                message: "Component can not be loaded when you have no rights",
                error: 404,
                success: false
            });
        }

        // we need check token valid
        core.tokenController.checkToken(token).then(function(_value) {
            var component = core.componentController.get(_event.componentName); // todo component can be !!undefined
            var path = core.componentController.getPath(_event.componentName)

            api.send(_connection_id, _response_id, {
                eventType: "responseComponentLoad",
                component: component,
                path: path,
                success: true
            });
        }.bind(this), function() {
            api.send(_connection_id, _response_id, {
                eventType: "responseComponentLoad",
                message: "Component can not be loaded when you have no rights",
                error: 404,
                success: false
            });
        }.bind(this));
    } else {
        // when component public
        var component = core.componentController.get(_event.componentName); // todo component can be !!undefined
        var path = core.componentController.getPath(_event.componentName)

        api.send(_connection_id, _response_id, {
            eventType: "responseComponentLoad",
            component: component,
            path: path,
            success: true
        });
    }
};

module.exports = {
    load: load,
    isProtect: isProtect,
};