/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/22/20.
 */

const classCreator = require("../../../env/tools/class");
const extend = require("../../../env/tools/extend");
const exist = require("../../../env/tools/exist");
const ShipProvider = require("../../providers/ship");
const Observer = require("../../../utils/observer");
const Subscriber = require("../../../utils/subscriber");
const AttributeAbstract = require("../../../utils/attribute");

const Ship = classCreator("Ship", AttributeAbstract, {
  constructor: function Ship(_options) {
    const opts = extend(
      {
        characterId: null,
      },
      _options,
    );

    AttributeAbstract.prototype.constructor.call(this, opts);
  },
  _createObserver() {
    this.observer = new Observer({
      isCreateInstant: true,
      objectCreatorFunction: function () {
        return new ShipProvider({
          characterId: this.options.characterId,
          accessToken: this.options.accessToken,
        });
      }.bind(this),
      onStart(_object) {
        _object.start();
      },
      onStop(_object) {
        _object.stop();
      },
    });

    this.observer.object().on("change", this._updateShip.bind(this));
  },
  _updateShip(_value) {
    if (!exist(this._value) || this._value !== _value) {
      this._value = _value;
      // also we need update database state
      core.dbController.charactersDB
        .set(this.options.characterId, "ship", _value)
        .then(
          () => {
            this._subscriber &&
              this._subscriber.notify({
                type: "update",
                data: _value,
              });
            this.emit("change", _value);
          },
          () => {
            // do nothing
          },
        );
    }
  },
  __createSubscriber(resolve) {
    if (!this._subscriber) {
      core.dbController.charactersDB.get(this.options.characterId, "ship").then(
        (_value) => {
          this._subscriber = new Subscriber({
            responseCommand: "responseEveCharacterShip",
            data: _value,
            onStart: function () {
              this._subscriberId = this.observer.subscribe();
            }.bind(this),
            onStop: function () {
              this.observer.unsubscribe(this._subscriberId);
              this._subscriberId = -1;
            }.bind(this),
          });

          resolve();
        },
        () => {
          // Error on try get online
          // debugger;
        },
      );
    } else {
      resolve();
    }
  },
  async _bulkNotify(_connectionId, _responseId) {
    if (exist(this._subscriber)) {
      let value = null;

      if (exist(this._value)) value = this._value;
      else
        value = await core.dbController.charactersDB.get(
          this.options.characterId,
          "ship",
        );

      this._subscriber.notifyFor(_connectionId, _responseId, {
        type: "bulk",
        data: value,
      });
    }
  },
});

module.exports = Ship;
