/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/22/20.
 */

const classCreator = require("../../../env/tools/class");
const extend = require("../../../env/tools/extend");
const exist = require("../../../env/tools/exist");
const OnlineProvider = require("../../providers/online");
const Observer = require("../../../utils/observer");
const Subscriber = require("../../../utils/subscriber");
const AttributeAbstract = require("../../../utils/attribute");

const Online = classCreator("Online", AttributeAbstract, {
  constructor: function Online(_options) {
    const opts = extend(
      {
        characterId: null,
      },
      _options,
    );

    AttributeAbstract.prototype.constructor.call(this, opts);
  },
  __createSubscriber(resolve) {
    if (!this._subscriber) {
      core.dbController.charactersDB
        .get(this.options.characterId, "online")
        .then(
          (_isOnline) => {
            this._subscriber = new Subscriber({
              responseCommand: "responseEveCharacterOnline",
              data: _isOnline,
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
  _createObserver() {
    this.observer = new Observer({
      isCreateInstant: true,
      objectCreatorFunction: function () {
        return new OnlineProvider({
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

    this.observer.object().on("change", this._updateOnline.bind(this));
  },
  async _updateOnline(_isOnline) {
    if (!exist(this._value) || this._value !== _isOnline) {
      this._value = _isOnline;
      try {
        await core.dbController.charactersDB.set(
          this.options.characterId,
          "online",
          _isOnline,
        );
        this._subscriber &&
          this._subscriber.notify({
            type: "update",
            data: _isOnline,
          });
        this.emit("change", _isOnline);
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // do nothing
      }
    }
  },
  serverStatusOffline() {
    AttributeAbstract.prototype.serverStatusOffline.call(this);

    this._updateOnline(false);
  },
  async _bulkNotify(_connectionId, _responseId) {
    if (exist(this._subscriber)) {
      let value = null;

      if (exist(this._value)) value = this._value;
      else
        value = await core.dbController.charactersDB.get(
          this.options.characterId,
          "online",
        );

      this._subscriber.notifyFor(_connectionId, _responseId, {
        type: "bulk",
        data: value,
      });
    }
  },
});

module.exports = Online;
