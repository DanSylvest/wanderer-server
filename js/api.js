/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 12/11/18.
 */

const Connector = require("./utils/connector");
const Emitter = require("./env/_new/tools/emitter");
const extend = require("./env/tools/extend");

class Api extends Emitter {
  constructor(_options) {
    super();
    const base = extend(
      {
        handlers: {},
      },
      _options,
    );

    this._createServer();

    this._handlers = base.handlers;
  }

  destructor() {
    super.destructor();
  }

  _createServer() {
    this._connector = new Connector({
      protocol: config.connection.protocol,
      port: config.connection.port,
      key: config.connection.ssl.key,
      cert: config.connection.ssl.cert,
    });
    this._connector.on("data", this._onData.bind(this));
    this._connector.on("closed", this._onClosed.bind(this));
    this._connector.on("newConnection", this._onNewConnection.bind(this));
  }

  _onData(_connectionId, _data) {
    let obj = { api: this._handlers };
    while (_data.route.length !== 0) {
      const hop = _data.route.shift();
      if ((hop && !obj[hop]) || !hop) {
        this.send(_connectionId, _data.responseId, { success: false });
        return;
      }

      obj = obj[hop];
    }

    if (typeof obj !== "function") {
      log(log.WARN, "ERROR INCOMING EVENT");
    } else {
      obj.call(null, _connectionId, _data.responseId, _data.data);
    }
  }

  _onClosed(_connectionId) {
    this.emit("connectionClosed", _connectionId);
  }

  _onNewConnection(_connectionId) {
    this.send(_connectionId, -1, { eventType: "newConnection" });
  }

  send(_connectionId, _responseId, _data) {
    this._connector.send(
      _connectionId,
      extend(_data, { responseId: _responseId }),
    );
  }
}

module.exports = Api;
