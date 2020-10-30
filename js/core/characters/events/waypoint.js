/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 10/1/20.
 */


var Emitter          = require("./../../../env/tools/emitter");
var classCreator     = require("./../../../env/tools/class");
var extend           = require("./../../../env/tools/extend");
// var exist            = require("./../../../env/tools/exist");
// var CustomPromise    = require("./../../../env/promise");

var WaypointProvider = require("./../../providers/waypoint");
// var Observer         = require("./../../../utils/observer");
// var Subscriber       = require("./../../../utils/subscriber");

var Waypoint = classCreator("Waypoint", Emitter, {
    constructor: function Waypoint(_options) {
        this.options = extend({
            accessToken: null
        },_options);

        Emitter.prototype.constructor.call(this);

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
});



module.exports = Waypoint;