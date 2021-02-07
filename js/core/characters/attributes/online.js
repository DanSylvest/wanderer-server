/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

const classCreator      = require("./../../../env/tools/class");
const extend            = require("./../../../env/tools/extend");
const exist             = require("./../../../env/tools/exist");
const OnlineProvider    = require("./../../providers/online");
const Observer          = require("./../../../utils/observer");
const Subscriber        = require("./../../../utils/subscriber");
const AttributeAbstract = require("./../../../utils/attribute");

const Online = classCreator("Online", AttributeAbstract, {
    constructor: function Online(_options) {
        let opts = extend({
            characterId: null
        }, _options);

        AttributeAbstract.prototype.constructor.call(this, opts);
    },
    __createSubscriber (resolve, reject) {
        if(!this._subscriber) {
            core.dbController.charactersDB.get(this.options.characterId, "online").then(function(_isOnline){
                this._subscriber = new Subscriber({
                    responseCommand: "responseEveCharacterOnline",
                    data: _isOnline,
                    onStart: function () {
                        this._subscriberId = this.observer.subscribe();
                    }.bind(this),
                    onStop: function () {
                        this.observer.unsubscribe(this._subscriberId);
                        this._subscriberId = -1;
                    }.bind(this)
                });

                resolve();
            }.bind(this), function(){
                // Error on try get online
                debugger;
            }.bind(this));
        } else {
            resolve();
        }
    },
    _createObserver: function  () {
        this.observer = new Observer({
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

        this.observer.object().on("change", this._updateOnline.bind(this));
    },
    _updateOnline: function (_isOnline) {
        if(!exist(this._value) || this._value !== _isOnline) {
            this._value = _isOnline;
            // also we need update database state
            core.dbController.charactersDB.set(this.options.characterId, "online", _isOnline).then(function () {
                this._subscriber && this._subscriber.notify(_isOnline);
                this.emit("change", _isOnline);
            }.bind(this), function () {
                // do nothing
            }.bind(this));
        }
    },
    serverStatusOffline () {
        AttributeAbstract.prototype.serverStatusOffline.call(this);

        this._updateOnline(false);
    }
});

module.exports = Online;