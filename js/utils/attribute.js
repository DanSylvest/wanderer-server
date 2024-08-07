/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 2/7/21.
 */

const Emitter = require("../env/tools/emitter");
const classCreator = require("../env/tools/class");
const extend = require("../env/tools/extend");
const exist = require("../env/tools/exist");
const CustomPromise = require("../env/promise");

const Attribute = classCreator("Online", Emitter, {
  constructor: function Online(_options) {
    this.options = extend(
      {
        accessToken: null,
      },
      _options,
    );

    Emitter.prototype.constructor.call(this);

    /** @type Subscriber */
    this._subscriber = null;
    this.observer = null;
    this._subscriberId = -1;
    this._paused = false;

    this._value = null;
    this._dtid = -1;

    this._innerSubscribers = Object.create(null);
    this._subscribeQueue = [];
    this._awaitSubscribers = [];
    this._subscriberReadyPromise = null;

    this._createObserver();
  },
  destructor() {
    if (this._dtid !== -1) clearTimeout(this._dtid);
    this._dtid = -1;

    if (this._subscriber) {
      this._subscriber.destructor();
      this._subscriber = null;
    }

    if (this.observer) {
      this.observer.destructor();
      this.observer = null;
    }

    // this._subscriberId = -1;

    this.options = Object.create(null);

    Emitter.prototype.destructor.call(this);
  },
  connectionBreak(_connectionId) {
    if (this._subscriber) {
      this._subscriber.removeSubscribersByConnection(_connectionId);
    }
  },

  // ============================
  //  SUBSCRIPTIONS METHODS
  // ============================
  async subscribe(_connectionId, _responseId) {
    if (this._paused) {
      this._subscribeQueue.push([_connectionId, _responseId]);
    } else {
      await this._createSubscriber();

      this._subscriber.addSubscriber(_connectionId, _responseId);
      this._bulkNotify(_connectionId, _responseId);
    }
  },
  unsubscribe(_connectionId, _responseId) {
    if (this._subscriber) {
      this._subscriber.removeSubscriber(_connectionId, _responseId);
    }
  },
  _bulkNotify() {},
  _createObserver() {},
  _createSubscriber() {
    if (!this._subscriberReadyPromise) {
      this._subscriberReadyPromise = new CustomPromise();
      this.__createSubscriber(
        () => this._subscriberReadyPromise.resolve(),
        () => this._subscriberReadyPromise.reject(),
      );
    }

    return this._subscriberReadyPromise.native;
  },
  __createSubscriber() {},
  /**
   * если кто-то подписался на прослушивание, то ему надо дать значение, если оно существует
   * @param _type
   * @param _callback
   * @returns {*}
   */
  on(_type, _callback) {
    const handleId = Emitter.prototype.on.call(this, _type, _callback);

    if (!this._paused) {
      this._innerSubscribers[handleId] = this.observer.subscribe();
    } else {
      this._awaitSubscribers.push(handleId);
    }

    if (_type === "change" && exist(this._value)) this._delayedNotify(handleId);

    return handleId;
  },

  off(_handleId) {
    let subscriptionId;

    if (this._paused) {
      this._awaitSubscribers.removeByValue(_handleId);
    }

    if (exist(_handleId)) {
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
  _delayedNotify(_handler) {
    if (this._dtid !== -1) clearTimeout(this._dtid);
    this._dtid = setTimeout(() => {
      this._dtid = -1;
      this.emitByHandler(_handler, this._value);
    }, 0);
  },
  serverStatusOffline() {
    this._paused = true;
    this.observer && this.observer.object().stop();
  },
  serverStatusOnline() {
    this._paused = false;
    this.observer && this.observer.object().start();
    this._subscribeQueue.map((x) => this.subscribe(x[0], x[1]));
    this._subscribeQueue = [];

    this._awaitSubscribers.map((handleId) => {
      this._innerSubscribers[handleId] = this.observer.subscribe();
    });
    this._awaitSubscribers = [];
  },
});

module.exports = Attribute;
