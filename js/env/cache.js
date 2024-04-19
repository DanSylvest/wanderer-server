/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 1/16/21.
 */
const CustomPromise = require("./promise");
const Emitter = require("./tools/emitter");
const classCreator = require("./tools/class");
const extend = require("./tools/extend");
const exist = require("./tools/extend");
const log = require("../utils/log");

const Cache = classCreator("Cache", Emitter, {
  constructor: function Cache(options) {
    this.options = extend(
      {
        showLogs: false,
        name: "default",
        getter: null,
        setter: null,
      },
      options,
    );

    Emitter.prototype.constructor.call(this);

    this._value = null;
    this.state = ST_INITIAL;
    this._waiters = [];
  },
  destructor() {
    this._value = null;

    Emitter.prototype.destructor.call(this);
  },

  get() {
    const outPr = new CustomPromise();
    this._addWaiterPromise(outPr);

    if (exist(this.options.getter)) {
      this.options.showLogs &&
        log(log.DEBUG, `[Cache:${this.options.name}] Try get`);

      switch (this.state) {
        case ST_INITIAL:
          this.state = ST_LOADING_DATA;
          this.options.showLogs &&
            log(log.DEBUG, `[Cache:${this.options.name}] Try loading...`);

          const pr = new CustomPromise();
          this.options.getter(pr.resolve.bind(pr), pr.reject.bind(pr));
          pr.native
            .then(
              this._updateCacheAfterLoadFromDb.bind(this),
              this._handleError.bind(this),
            )
            .catch(this._handleException.bind(this));

          break;
        case ST_HAS_DATA:
          this.options.showLogs &&
            log(
              log.DEBUG,
              `[Cache:${this.options.name}] Instant resolve data.`,
            );
          this._resolveWaiters(this._value);
          break;
      }
    }

    return outPr.native;
  },

  set(data) {
    const outPr = new CustomPromise();
    this._addWaiterPromise(outPr);

    if (exist(this.options.setter)) {
      this.state = ST_UPDATING_DATA;
      this.options.showLogs &&
        log(log.DEBUG, `[Cache:${this.options.name}] Try set...`);

      const pr = new CustomPromise();
      this.options.setter(data, pr.resolve.bind(pr), pr.reject.bind(pr));
      pr.native
        .then(
          this._updateCacheAfterUpdateDb.bind(this, data),
          this._handleError.bind(this),
        )
        .catch(this._handleException.bind(this));
    }

    return outPr.native;
  },

  _addWaiterPromise(pr) {
    this.options.showLogs &&
      log(log.DEBUG, `[Cache:${this.options.name}] Add await promise)`);
    this._waiters.push(pr);
  },

  _resolveWaiters(data) {
    this.options.showLogs &&
      log(
        log.DEBUG,
        `[Cache:${this.options.name}] Resolve await promises [${this._waiters.length}]`,
      );
    this._waiters.map((pr) => pr.resolve(data));
    this._waiters = [];
  },

  _updateCacheAfterLoadFromDb(data) {
    this.options.showLogs &&
      log(log.DEBUG, `[Cache:${this.options.name}] After Load from DB`);
    switch (this.state) {
      case ST_LOADING_DATA:
        this.state = ST_HAS_DATA;
        this.options.showLogs &&
          log(
            log.DEBUG,
            `[Cache:${this.options.name}] SET LOADED DATA FROM DB`,
          );

        this._value = data;
        this._resolveWaiters(data);
        break;
    }
  },

  _updateCacheAfterUpdateDb(data) {
    this.options.showLogs &&
      log(log.DEBUG, `[Cache:${this.options.name}] After Update db`);

    switch (this.state) {
      case ST_UPDATING_DATA:
        this.state = ST_HAS_DATA;
        this.options.showLogs &&
          log(log.DEBUG, `[Cache:${this.options.name}] SET UPDATED DATA`);
        this._value = data;
        this._resolveWaiters(data);
        break;
    }
  },

  _handleError(err) {
    // debugger;
    log(
      log.ERR,
      `[Cache:${this.options.name}] Handled error ${JSON.stringify(err)}`,
    );
  },

  _handleException(exception) {
    // debugger;
    log(
      log.ERR,
      `[Cache:${this.options.name}] Handled exception ${JSON.stringify(exception)}`,
    );
  },
});

let counter = 0;
const ST_INITIAL = counter++;
const ST_LOADING_DATA = counter++;
const ST_UPDATING_DATA = counter++;
const ST_HAS_DATA = counter++;

module.exports = Cache;
