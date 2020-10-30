/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Emitter          = require("./../../../env/tools/emitter");
var classCreator     = require("./../../../env/tools/class");
var extend           = require("./../../../env/tools/extend");
var exist            = require("./../../../env/tools/exist");
var CustomPromise    = require("./../../../env/promise");

var ShipProvider     = require("./../../providers/ship");
var Observer         = require("./../../../utils/observer");
var Subscriber       = require("./../../../utils/subscriber");

var Ship = classCreator("Ship", Emitter, {
    constructor: function Ship(_options) {
        this.options = extend({
            characterId: null,
            accessToken: null
        },_options);

        Emitter.prototype.constructor.call(this);


        /** @type Subscriber */
        this._subscriber = null;
        this.observer = null;
        this._subscriberId = -1;
        this._dtid = -1;
        this._value = null;

        this._innerSubscribers = Object.create(null);

        this._createShipProvider();
    },
    destructor: function () {
        if(this._dtid !== -1) clearTimeout(this._dtid);
        this._dtid = -1;

        if(this._subscriber){
            this._subscriber.destructor();
            this._subscriber = null;
        }

        if(this.observer) {
            this.observer.destructor();
            this.observer = null;
        }

        this._subscriberId = -1;

        this.options = Object.create(null);

        Emitter.prototype.destructor.call(this);
    },
    connectionBreak: function (_connectionId) {
        if(this._subscriber) {
            this._subscriber.removeSubscribersByConnection(_connectionId);
        }
    },


    // ============================
    //  SUBSCRIPTIONS METHODS
    // ============================
    subscribe: function (_connectionId, _responseId) {
        this._createShipSubscriber().then(function(){
            this._subscriber.addSubscriber(_connectionId, _responseId);
        }.bind(this), function(){
            // do nothing
        }.bind(this));
    },
    unsubscribe: function (_connectionId, _responseId) {
        if(this._subscriber) {
            this._subscriber.removeSubscriber(_connectionId, _responseId);
        }
    },


    // ============================
    //  PROTECTED METHODS
    // ============================

    // ======== PROVIDERS PART =======
    _createShipProvider: function  () {
        this.observer = new Observer({
            isCreateInstant: true,
            objectCreatorFunction: function () {
                return new ShipProvider({
                    characterId: this.options.characterId,
                    accessToken: this.options.accessToken,
                });
            }.bind(this),
            onStart: function (_object) {
                _object.start();
            },
            onStop: function (_object) {
                _object.stop();
            }
        });

        this.observer.object().on("change", this._updateShip.bind(this));
    },
    _updateShip: function (_value) {
        if(!exist(this._value) || this._value !== _value) {
            // also we need update database state
            core.dbController.charactersDB.set(this.options.characterId, "ship", _value).then(function () {
                this._subscriber && this._subscriber.notify(_value);
                this.emit("change", _value);
            }.bind(this), function () {
                // do nothing
            }.bind(this));
        }
    },
    // ======== PROVIDERS PART =======


    // ======== SUBSCRIBERS PART =======
    _createShipSubscriber: function () {
        var pr = new CustomPromise();

        if(!this._subscriber) {
            core.dbController.charactersDB.get(this.options.characterId, "ship").then(function(_value){
                this._subscriber = new Subscriber({
                    responseCommand: "responseEveCharacterShip",
                    data: _value,
                    onStart: function () {
                        this._subscriberId = this.observer.subscribe();
                    }.bind(this),
                    onStop: function () {
                        this.observer.unsubscribe(this._subscriberId);
                        this._subscriberId = -1;
                    }.bind(this)
                });

                pr.resolve();
            }.bind(this), function(){
                // Error on try get online
                debugger;
            }.bind(this));
        } else {
            pr.resolve();
        }

        return pr.native;
    },

    on: function (_type, _callback) {
        var handleId = Emitter.prototype.on.call(this, _type, _callback);
        this._innerSubscribers[handleId] = this.observer.subscribe();

        if(_type === "change" && exist(this._value))
            this._delayedNotify(handleId);

        return handleId;
    },

    off: function (_handleId) {
        var subscriptionId;

        if(exist(_handleId)) {
            subscriptionId = this._innerSubscribers[_handleId];
            this.observer.unsubscribe(subscriptionId);
            delete this._innerSubscribers[_handleId];
        } else {
            for (subscriptionId in this._innerSubscribers) {
                this.observer.unsubscribe(subscriptionId);
            }

            this._innerSubscribers = Object.create(null);
        }

        Emitter.prototype.off.call(this, _handleId);
    },
    _delayedNotify: function (_handler) {
        if(this._dtid !== -1) clearTimeout(this._dtid);
        this._dtid = setTimeout(function () {
            this._dtid = -1;
            this.emitByHandler(_handler, this._value);
        }.bind(this), 0);
    }
});



module.exports = Ship;