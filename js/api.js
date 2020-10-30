/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 12/11/18.
 */

var Connector       = require("./utils/connector");
var Emitter         = require("./env/tools/emitter");
var classCreator    = require("./env/tools/class");
var extend          = require("./env/tools/extend");

var Api = classCreator("Api", Emitter, {
    constructor: function Api(_options) {
        var base = extend({
            handlers: {}
        }, _options);

        Emitter.prototype.constructor.call(this);

        this._createServer();

        this._handlers = base.handlers;
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    _createServer: function () {
        this._connector = new Connector(config.connection.port);
        this._connector.on("data", this._onData.bind(this));
        this._connector.on("closed", this._onClosed.bind(this));
        this._connector.on("newConnection", this._onNewConnection.bind(this));
    },
    _onData: function (_connectionId, _data) {
        var obj = {api: this._handlers};
        while (_data.route.length !== 0) {
            var hop = _data.route.shift();
            if (hop && !obj[hop] || !hop) {
                this.send(_connectionId, _data.responseId, {success: false});
                return;
            }

            obj = obj[hop];
        }

        if (typeof obj !== "function") {
            log(log.WARN, "ERROR INCOMING EVENT");
        } else {
            obj.call(null, _connectionId, _data.responseId, _data.data);
        }
    },
    _onClosed: function (_connectionId, _data) {
        this.emit("connectionClosed", _connectionId);
    },
    _onNewConnection: function (_connectionId) {
        this.send(_connectionId, -1, {eventType: "newConnection"});
    },
    send: function (_connectionId, _responseId, _data) {
        this._connector.send(_connectionId, extend(_data, {responseId: _responseId}))
    },
});

module.exports = Api;

