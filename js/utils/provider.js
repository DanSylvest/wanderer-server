/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Emitter      = require("./../env/tools/emitter");
var classCreator = require("./../env/tools/class");
var extend       = require("./../env/tools/extend");
var printf       = require("./../env/tools/print_f");
var log          = require("./log");

var Provider = classCreator("Provider", Emitter, {
    constructor: function Provider(_options) {
        this.options = extend({
            name: "defaultProvider",
            /** @type Function */
            accessToken: null,
            /** @type Number - this is milliseconds */
            timeout: 10000,
            showLogs: false,
            isOnce: false
        }, _options);

        Emitter.prototype.constructor.call(this);

        this._isStarted = false;
        this._tid = -1;
        this._token = "";
        this._lastChangedValue = null;
    },
    destructor: function () {
        this._tid !== -1 && clearTimeout(this._tid);

        this._isStarted = false;
        this._tid = -1;
        this._token = "";
        this._lastChangedValue = null;

        this.options = Object.create(null);

        Emitter.prototype.destructor.call(this);
    },
    start: function () {
        this.options.showLogs && log(log.DEBUG, printf("Provider [%s] has started", this.options.name));

        if(!this._isStarted) {
            this._isStarted = true;
            this._triggerTimeout();
        }
    },
    stop: function () {
        this.options.showLogs && log(log.DEBUG, printf("Provider [%s] has stopped", this.options.name));
        this._tid !== -1 && clearTimeout(this._tid);
        this._tid = -1;
        this._isStarted = false;
        this._token = "";
    },
    _tick: function () {
        this.options.showLogs && log(log.DEBUG, printf("Provider [%s] tick", this.options.name));
        if(this.options.accessToken) {
            var perfTime = +new Date;
            this.options.accessToken().then(function (_token) {
                log(log.DEBUG, printf("Provider [%s] accessToken update time [%s]", this.options.name, (+new Date - perfTime)));
                this.options.showLogs && log(log.DEBUG, printf("Provider [%s] load with access token [%s]", this.options.name, _token));
                this._token = _token;
                // core.requestSystem.get_bearer(_token, this.options.path, {}, this._onResponse.bind(this));
                this._sendRequest();
            }.bind(this), function () {
                // debugger; // on try get token raised Exception
            }.bind(this));
        } else {
            log(log.DEBUG, printf("Provider [%s] load without access token", this.options.name));
            // core.requestSystem.get_public(this.options.path, {}, this._onResponse.bind(this));
            this._sendRequest();
        }
    },
    _triggerTimeout: function () {
        this.options.showLogs && log(log.DEBUG, printf("Provider [%s] timeout [%sms] started", this.options.name, this.options.timeout));
        this._tid = setTimeout(this._triggerTimeoutEnd.bind(this), this.options.timeout);
    },
    _triggerTimeoutEnd: function () {
        this.options.showLogs && log(log.DEBUG, printf("Provider [%s] timeout ended", this.options.name, this.options.timeout));
        this._tid = -1;
        this._tick();
    },
    _notify: function (_value) {
        !this.options.isOnce && this._triggerTimeout();
        this.options.showLogs && log(log.DEBUG, printf("Provider [%s] notify", this.options.name));
        this._lastChangedValue = _value;
        this.emit("change", _value);
    },
    _next: function () {
        this._triggerTimeout();
    },
    _sendRequest: function () {

    }
});

module.exports = Provider;