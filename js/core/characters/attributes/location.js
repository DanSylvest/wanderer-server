/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/22/20.
 */

const classCreator = require("../../../env/tools/class");
const extend = require("../../../env/tools/extend");
const exist = require("../../../env/tools/exist");
const LocationProvider = require("../../providers/location");
const Observer = require("../../../utils/observer");
const Subscriber = require("../../../utils/subscriber");
const AttributeAbstract = require("../../../utils/attribute");

const Location = classCreator("Location", AttributeAbstract, {
  constructor: function Location(_options) {
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
        return new LocationProvider({
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

    this.observer.object().on("change", this._updateLocation.bind(this));
  },
  _updateLocation(_value) {
    if (!exist(this._value) || this._value !== _value) {
      this._value = _value;
      // also we need update database state
      core.dbController.charactersDB
        .set(this.options.characterId, "location", _value)
        .then(
          () => {
            this._subscriber &&
              this._subscriber.notify({
                type: "update",
                data: _value.toString(),
              });
            this.emit("change", _value);
          },
          () => {
            // do nothing
          },
        );
    }
  },
  async __createSubscriber(resolve) {
    if (!this._subscriber) {
      core.dbController.charactersDB
        .get(this.options.characterId, "location")
        .then(
          (_value) => {
            this._subscriber = new Subscriber({
              responseCommand: "responseEveCharacterLocation",
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
          "location",
        );

      this._subscriber.notifyFor(_connectionId, _responseId, {
        type: "bulk",
        data: value.toString(),
      });
    }
  },
});

module.exports = Location;
