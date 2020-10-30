/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 4/11/20.
 */

var WebSocketServer = require('websocket').server;
var http            = require('http');

var Emitter         = require("./../env/tools/emitter");
var classCreator    = require("./../env/tools/class");
var log             = require("./log");

var Connector = classCreator("Connector", Emitter, {
    constructor: function connector(_port) {
        Emitter.prototype.constructor.call(this);

        this._counter = 0;
        this._port = _port || 1414;
        this._connections = {};

        this.createSocket();
    },
    createSocket: function () {
        this._server = http.createServer(function(request, response) {});

        this._server.listen(this._port, function() {
            log(log.INFO, "WebSocket Server started and listening on port (%s)", this._port);
        }.bind(this));

        this._wsServer = new WebSocketServer({
            httpServer: this._server
        });

        this._wsServer.on("request", this._onRequest.bind(this));
    },
    _onRequest: function(_request){
        var connection_id = this._counter++;
        log(log.INFO, "New connection: %s", connection_id);

        var connection = _request.accept(null, _request.origin);
        connection.on("message", this._onMessage.bind(this, connection_id));
        connection.on("close", this._onClose.bind(this, connection_id));
        this._connections[connection_id] = connection;

        log(log.INFO, connection.remoteAddress);

        this.emit("newConnection",  connection_id );
    },
    _onClose: function(_connectionId, _connection) {
        log(log.INFO, "Socket closed:");
        this.emit("closed", _connectionId, {reason: "socket closed"});
        delete this._connections[_connectionId];
    },
    _onMessage: function(_connection_id, _message){
        if (_message.type === 'utf8') {
            log(log.INFO, "\nIN:\n" + _message.utf8Data.toString());
            this.emit("data", _connection_id, JSON.parse(_message.utf8Data));
        }
    },
    send: function(_connection_id, _data) {
        var connection = this._connections[_connection_id];
        if (!connection) {
            return;
        }

        var str = JSON.stringify(_data);
        log(log.DEBUG, "\nOUT:\n" + str);

        var send = function () {
            try {
                connection.send(str);
            } catch (e) {
                log(log.ERR, "ERROR: ", e);
                send();
            }
        }.bind(this);

        send();
    },
    getIp: function (_connection_id) {
        return this._connections[_connection_id].remoteAddress;
    },
    exist: function (_connectionId) {
        return this._connections[_connectionId] !== undefined;
    }
});

module.exports = Connector;