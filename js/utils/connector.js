/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 4/11/20.
 */

const WebSocketServer = require("websocket").server;
const http = require("http");
const https = require("https");
const fs = require("fs");
const extend = require("../env/tools/extend");
const Emitter = require("../env/tools/emitter");
const classCreator = require("../env/tools/class");
const log = require("./log");

const Connector = classCreator("Connector", Emitter, {
  constructor: function connector(options) {
    this.options = extend(
      {
        protocol: "http",
        port: 1414,
        key: "",
        cert: "",
      },
      options,
    );

    Emitter.prototype.constructor.call(this);

    this._counter = 0;
    this._connections = {};

    this.createSocket();
  },
  createSocket() {
    switch (this.options.protocol) {
      case "http":
        this._server = http.createServer(() => {});
        break;
      case "https":
        this._server = https.createServer(
          {
            key: fs.readFileSync(this.options.key),
            cert: fs.readFileSync(this.options.cert),
          },
          () => {},
        );
        break;
    }

    this._server.listen(this.options.port, () => {
      log(
        log.INFO,
        "WebSocket Server started and listening on port (%s)",
        this.options.port,
      );
    });

    this._wsServer = new WebSocketServer({
      httpServer: this._server,
    });

    this._wsServer.on("request", this._onRequest.bind(this));
  },
  _onRequest(_request) {
    const connection_id = this._counter++;
    log(log.INFO, "New connection: %s", connection_id);

    const connection = _request.accept(null, _request.origin);
    connection.on("message", this._onMessage.bind(this, connection_id));
    connection.on("close", this._onClose.bind(this, connection_id));
    this._connections[connection_id] = connection;

    log(log.INFO, connection.remoteAddress);

    this.emit("newConnection", connection_id);
  },
  _onClose(_connectionId) {
    log(log.INFO, "Socket closed:");
    this.emit("closed", _connectionId, { reason: "socket closed" });
    delete this._connections[_connectionId];
  },
  _onMessage(_connection_id, _message) {
    if (_message.type === "utf8") {
      // log(log.INFO, "\nIN:\n" + _message.utf8Data.toString());
      this.emit("data", _connection_id, JSON.parse(_message.utf8Data));
    }
  },
  send(_connection_id, _data) {
    const connection = this._connections[_connection_id];
    if (!connection) {
      return;
    }

    const str = JSON.stringify(_data);
    // eslint-disable-next-line no-constant-binary-expression
    false && log(log.DEBUG, `\nOUT:\n${str}`);

    const send = function () {
      try {
        connection.send(str);
      } catch (e) {
        log(log.ERR, "ERROR: ", e);
        send();
      }
    };

    send();
  },
  getIp(_connection_id) {
    return this._connections[_connection_id].remoteAddress;
  },
  exist(_connectionId) {
    return this._connections[_connectionId] !== undefined;
  },
});

module.exports = Connector;
