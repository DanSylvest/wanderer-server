/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

const classCreator      = require("./../../../env/tools/class");
const extend            = require("./../../../env/tools/extend");
const exist             = require("./../../../env/tools/exist");
const ShipProvider      = require("./../../providers/ship");
const Observer          = require("./../../../utils/observer");
const Subscriber        = require("./../../../utils/subscriber");
const AttributeAbstract = require("./../../../utils/attribute");

const Ship = classCreator("Ship", AttributeAbstract, {
    constructor: function Ship(_options) {
        let opts = extend({
            characterId: null
        }, _options);

        AttributeAbstract.prototype.constructor.call(this, opts);
    },
    _createObserver: function  () {
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
            this._value = _value;
            // also we need update database state
            core.dbController.charactersDB.set(this.options.characterId, "ship", _value).then(function () {
                this._subscriber && this._subscriber.notify(_value);
                this.emit("change", _value);
            }.bind(this), function () {
                // do nothing
            }.bind(this));
        }
    },
    __createSubscriber (resolve, reject) {
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

                resolve();
            }.bind(this), function(){
                // Error on try get online
                debugger;
            }.bind(this));
        } else {
            resolve();
        }
    }
});

module.exports = Ship;