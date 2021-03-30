/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 10/1/20.
 */


const Emitter          = require("./../../../env/tools/emitter");
const classCreator     = require("./../../../env/tools/class");
const extend           = require("./../../../env/tools/extend");
const WaypointProvider = require("./../../providers/waypoint");

const Waypoint = classCreator("Waypoint", Emitter, {
    constructor: function Waypoint(_options) {
        this.options = extend({
            accessToken: null
        }, _options);

        Emitter.prototype.constructor.call(this);

        this._paused = false;
        this._lastRequest = null;
    },
    destructor: function () {
        this.options = Object.create(null);
        this._destroyProvider();

        Emitter.prototype.destructor.call(this);
    },
    connectionBreak: function (_connectionId) {

    },
    _createProvider: function () {
        this._provider = new WaypointProvider({
            accessToken: this.options.accessToken,
            destinationId: this.destinationId,
            clearOtherWaypoints: this.clearOtherWaypoints,
            addToBeginning: this.addToBeginning,
        });
        this._provider.on("change", this._onChange.bind(this));
        this._provider.start();
    },
    _destroyProvider: function () {
        this._provider && this._provider.destructor();
    },
    _onChange: function () {
        this._destroyProvider();
    },
    set: function (_type, _destinationSolarSystemId) {
        if(this._paused) {
            this._lastRequest = [_type, _destinationSolarSystemId];
            return;
        }

        switch (_type) {
            case 0:
                this.destinationId = _destinationSolarSystemId;
                this.clearOtherWaypoints = true;
                this.addToBeginning = false;
                break;
            case 1:
                this.destinationId = _destinationSolarSystemId;
                this.clearOtherWaypoints = false;
                this.addToBeginning = true;
                break;
            case 2:
                this.destinationId = _destinationSolarSystemId;
                this.clearOtherWaypoints = false;
                this.addToBeginning = false;
                break;
        }

        // Если по какойто причине не успела установиться точка, будем считать, что следующий запрос перекрывает ее.
        this._destroyProvider();
        this._createProvider();
        // TODO Important
        // Думаю что здесь будет необходимо организовать очередь, дабы не спамили
        // Но пока можно без нее обойтись
    },
    serverStatusOffline () {
        this._paused = true;
        this._provider && this._provider.stop();
    },
    serverStatusOnline () {
        if(this._lastRequest) {
            this._paused = false;
            this._provider && this._provider.start();
            this._lastRequest && this.set(this._lastRequest[0], this._lastRequest[1]);
            this._lastRequest = null;
        }
    }
});



module.exports = Waypoint;