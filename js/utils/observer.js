/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Emitter      = require("./../env/tools/emitter");
var classCreator = require("./../env/tools/class");
var extend       = require("./../env/tools/extend");

var counter = 0;

var Observer = classCreator("Observer", Emitter, {
    constructor: function Observer(_options) {
        this.options = extend({
            isCreateInstant: false,
            objectCreatorFunction: null,
            onStart: null,
            onStop: null
        }, _options);

        Emitter.prototype.constructor.call(this);

        this._isStarted = false;
        this._isCreated = false;
        this._tid = -1;
        this._object = null;
        this._subscribers = Object.create(null);
        this._subscribersCount = 0;

        if(this.options.isCreateInstant) {
            this._isCreated = true;
            this._object = this.options.objectCreatorFunction();
        }
    },
    destructor: function () {
        this.options = Object.create(null);

        this._object && this._object.destructor();
        this._object = null;

        this._isStarted = false;
        this._isCreated = false;
        this._tid = -1;
        this._subscribers = Object.create(null);
        this._subscribersCount = 0;

        Emitter.prototype.destructor.call(this);
    },
    subscribe: function () {
        var id = counter++;
        this._subscribers[id] = true;
        this._subscribersCount++;

        if(this._subscribersCount === 1) {
            if(!this._isCreated && !this.options.isCreateInstant) {
                this._isCreated = true;
                this._object = this.options.objectCreatorFunction();
            }

            if(!this._isStarted) {
                this._isStarted = true;
                this.options.onStart(this._object);
            }
        }
        return id;
    },
    unsubscribe: function (_id) {
        var subscription = this._subscribers[_id];

        if(subscription) {
            this._subscribersCount--;
            delete this._subscribers[_id];

            if(this._subscribersCount === 0) {
                this.options.onStop(this._object);
                this._isStarted = false;
            }
        }
    },
    object: function () {
        return this._object;
    }
});

module.exports = Observer;