/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Emitter        = require("./../../../env/tools/emitter");
var classCreator   = require("./../../../env/tools/class");
var extend         = require("./../../../env/tools/extend");
var exist          = require("./../../../env/tools/exist");
var CustomPromise  = require("./../../../env/promise");

var OnlineProvider = require("./../../providers/online");
var Observer       = require("./../../../utils/observer");
var Subscriber     = require("./../../../utils/subscriber");

var Online = classCreator("Online", Emitter, {
    constructor: function Online(_options) {
        this.options = extend({
            characterId: null,
            accessToken: null
        },_options);

        Emitter.prototype.constructor.call(this);


        /** @type Subscriber */
        this._onlineSubscriber = null;
        this.subscriber = null;
        this._onlineSubscriberId = -1;

        this._value = null;
        this._dtid = -1;

        this._innerSubscribers = Object.create(null);

        this._createOnlineProvider();
    },
    destructor: function () {
        if(this._dtid !== -1) clearTimeout(this._dtid);
        this._dtid = -1;

        if(this._onlineSubscriber){
            this._onlineSubscriber.destructor();
            this._onlineSubscriber = null;
        }

        if(this.subscriber) {
            this.subscriber.destructor();
            this.subscriber = null;
        }

        this._onlineSubscriberId = -1;

        this.options = Object.create(null);

        Emitter.prototype.destructor.call(this);
    },
    connectionBreak: function (_connectionId) {
        if(this._onlineSubscriber) {
            this._onlineSubscriber.removeSubscribersByConnection(_connectionId);
        }
    },


    // ============================
    //  SUBSCRIPTIONS METHODS
    // ============================
    subscribe: function (_connectionId, _responseId) {
        this._createOnlineSubscriber().then(function(){
            this._onlineSubscriber.addSubscriber(_connectionId, _responseId);
        }.bind(this), function(){
            // do nothing
        }.bind(this));
    },
    unsubscribe: function (_connectionId, _responseId) {
        if(this._onlineSubscriber) {
            this._onlineSubscriber.removeSubscriber(_connectionId, _responseId);
        }
    },


    // ============================
    //  PROTECTED METHODS
    // ============================

    // ======== PROVIDERS PART =======
    _createOnlineProvider: function  () {
        this.subscriber = new Observer({
            isCreateInstant: true,
            objectCreatorFunction: function () {
                return new OnlineProvider({
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

        this.subscriber.object().on("change", this._updateOnline.bind(this));
    },
    _updateOnline: function (_isOnline) {
        if(!exist(this._value) || this._value !== _isOnline) {
            this._value = _isOnline;
            // also we need update database state
            core.dbController.charactersDB.set(this.options.characterId, "online", _isOnline).then(function () {
                this._onlineSubscriber && this._onlineSubscriber.notify(_isOnline);
                this.emit("change", _isOnline);
            }.bind(this), function () {
                // do nothing
            }.bind(this));
        }
    },
    // ======== PROVIDERS PART =======


    // ======== SUBSCRIBERS PART =======
    _createOnlineSubscriber: function () {
        var pr = new CustomPromise();

        if(!this._onlineSubscriber) {
            core.dbController.charactersDB.get(this.options.characterId, "online").then(function(_isOnline){
                this._onlineSubscriber = new Subscriber({
                    responseCommand: "responseEveCharacterOnline",
                    data: _isOnline,
                    onStart: function () {
                        this._onlineSubscriberId = this.subscriber.subscribe();
                    }.bind(this),
                    onStop: function () {
                        this.subscriber.unsubscribe(this._onlineSubscriberId);
                        this._onlineSubscriberId = -1;
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

    /**
     * если кто-то подписался на прослушивание, то ему надо дать значение, если оно существует
     * @param _type
     * @param _callback
     * @returns {*}
     */
    on: function (_type, _callback) {
        var handleId = Emitter.prototype.on.call(this, _type, _callback);
        this._innerSubscribers[handleId] = this.subscriber.subscribe();

        if(_type === "change" && exist(this._value))
            this._delayedNotify(handleId);

        return handleId;
    },

    off: function (_handleId) {
        var subscriptionId;

        if(exist(_handleId)) {
            subscriptionId = this._innerSubscribers[_handleId];
            this.subscriber.unsubscribe(subscriptionId);
            delete this._innerSubscribers[_handleId];
        } else {
            for (subscriptionId in this._innerSubscribers) {
                this.subscriber.unsubscribe(subscriptionId);
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



module.exports = Online;