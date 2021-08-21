/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 10/1/20.
 */
const Emitter = require("./../../../env/_new/tools/emitter");
const extend = require("./../../../env/tools/extend");
const WaypointProvider = require("./../../providers/waypoint");

class Waypoint extends Emitter {
    constructor(_options) {
        super();
        this.options = extend({
            accessToken: null
        }, _options);

        this._paused = false;
        this._lastRequest = null;
    }

    destructor() {
        this.options = Object.create(null);
        this._destroyProvider();

        super.destructor();
    }

    connectionBreak(_connectionId) {

    }

    _createProvider() {
        this._provider = new WaypointProvider({
            accessToken: this.options.accessToken,
            destinationId: this.destinationId,
            clearOtherWaypoints: this.clearOtherWaypoints,
            addToBeginning: this.addToBeginning,
        });
        this._provider.on("change", this._onChange.bind(this));
        this._provider.start();
    }

    _destroyProvider() {
        this._provider && this._provider.destructor();
    }

    _onChange() {
        this._destroyProvider();
    }

    set(_type, _destinationSolarSystemId) {
        if (this._paused) {
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
    }

    serverStatusOffline() {
        this._paused = true;
        this._provider && this._provider.stop();
    }

    serverStatusOnline() {
        if (this._lastRequest) {
            this._paused = false;
            this._provider && this._provider.start();
            this._lastRequest && this.set(this._lastRequest[0], this._lastRequest[1]);
            this._lastRequest = null;
        }
    }
}


module.exports = Waypoint;