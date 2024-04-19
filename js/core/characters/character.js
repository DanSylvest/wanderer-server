/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/22/20.
 */

const Emitter = require("../../env/_new/tools/emitter");
const extend = require("../../env/tools/extend");
const waiter = require("../../env/tools/waiter");
const CustomPromise = require("../../env/promise");
const Cache = require("../../env/cache");

const log = require("../../utils/log");

const OAuth = require("../../esi/oauth");
const OnlineAttribute = require("./attributes/online");
const LocationAttribute = require("./attributes/location");
const ShipAttribute = require("./attributes/ship");
const WaypointEvent = require("./events/waypoint");
const Search = require("./utils/search");

class Character extends Emitter {
  constructor(_options) {
    super();

    this.options = extend(
      {
        showLogs: false,
        characterId: null,
      },
      _options,
    );

    this._attributes = Object.create(null);
    this._isRefreshingToken = false;
    this._refreshAccessTokenResolver = null;
    this._refreshAccessTokenMaxCount = 10;
    this._refreshAccessTokenCount = 0;

    this._createUtils();
    this._createEvents();
    this._createCachedAttrs();
  }

  destructor() {
    this.waypoint.destructor();

    for (const id in this._attributes) this._attributes[id].destructor();

    this._attributes = Object.create(null);
    this._isRefreshingToken = false;
    this._refreshAccessTokenResolver = null;
    this.options = Object.create(null);

    super.destructor();
  }

  _createEvents() {
    if (this.options.characterId === undefined) {
      // eslint-disable-next-line no-debugger
      debugger;
    }

    this.waypoint = new WaypointEvent({
      accessToken: this.getAccessToken.bind(this),
    });

    !core.eveServer.isOnline() && this.waypoint.serverStatusOffline();
  }

  _createUtils() {
    this.search = new Search({
      accessToken: this.getAccessToken.bind(this),
      characterId: this.options.characterId,
    });

    !core.eveServer.isOnline() && this.search.serverStatusOffline();
  }

  _createCachedAttrs() {
    this.realExpiresIn = new Cache({
      name: "realExpiresIn",
      getter: function (resolve, reject) {
        core.dbController.charactersDB
          .get(this.options.characterId, "realExpiresIn")
          .then(resolve, reject);
      }.bind(this),
      setter: function (newVal, resolve, reject) {
        core.dbController.charactersDB
          .set(this.options.characterId, { realExpiresIn: newVal })
          .then(resolve, reject);
      }.bind(this),
    });

    this.accessToken = new Cache({
      name: "accessToken",
      getter: function (resolve, reject) {
        core.dbController.charactersDB
          .get(this.options.characterId, "accessToken")
          .then(resolve, reject);
      }.bind(this),
      setter: function (newVal, resolve, reject) {
        core.dbController.charactersDB
          .set(this.options.characterId, { accessToken: newVal })
          .then(resolve, reject);
      }.bind(this),
    });

    this.refreshToken = new Cache({
      name: "refreshToken",
      getter: function (resolve, reject) {
        core.dbController.charactersDB
          .get(this.options.characterId, "refreshToken")
          .then(resolve, reject);
      }.bind(this),
      setter: function (newVal, resolve, reject) {
        core.dbController.charactersDB
          .set(this.options.characterId, { refreshToken: newVal })
          .then(resolve, reject);
      }.bind(this),
    });
  }

  has(_attribute) {
    return !!this._attributes[_attribute];
  }

  get(_attribute) {
    if (!this.has(_attribute)) {
      const _class = this._attributesFactory(_attribute);

      const instance = new _class({
        characterId: this.options.characterId,
        accessToken: this.getAccessToken.bind(this),
      });
      this._add(_attribute, instance);

      !core.eveServer.isOnline() && instance.serverStatusOffline();
    }

    return this._attributes[_attribute];
  }

  _add(_attribute, _instance) {
    this._attributes[_attribute] = _instance;
  }

  _attributesFactory(_attribute) {
    switch (_attribute) {
      case "online":
        return OnlineAttribute;
      case "location":
        return LocationAttribute;
      case "ship":
        return ShipAttribute;
    }
  }

  connectionBreak(_connectionId) {
    for (const id in this._attributes) {
      this._attributes[id].connectionBreak(_connectionId);
    }
  }

  getAccessToken() {
    const pr = new CustomPromise();

    this._updateAccessToken()
      .then(
        () => this.accessToken.get(),
        (err) =>
          pr.reject({
            sub: err,
            message: "Error on _updateAccessToken",
          }),
      )
      .then(
        (accessToken) => pr.resolve(accessToken),
        (err) =>
          pr.reject({
            sub: err,
            message: "Error on get from [charactersDB] - accessToken",
          }),
      );

    return pr.native;
  }

  _checkAccessTokenExpire() {
    const pr = new CustomPromise();

    this.realExpiresIn.get().then(
      (val) => {
        const timeToExpires = val - +new Date();
        this.options.showLogs &&
          log(
            log.INFO,
            `[Character:${this.options.characterId}] Time to token expires is ${timeToExpires}`,
          );
        pr.resolve(timeToExpires <= 0);
      },
      (err) => {
        pr.reject({
          sub: err,
          message: "Error on load realExpiresIn",
        });
      },
    );

    return pr.native;
  }

  _updateAccessToken() {
    const pr = new CustomPromise();

    this._checkAccessTokenExpire().then(
      (_isExpire) => {
        if (_isExpire) {
          this._refreshAccessToken().then(
            () => {
              pr.resolve();
            },
            (_err) => {
              pr.reject({
                sub: _err,
                message: "Error try refresh accessToken",
              });
            },
          );
        } else {
          pr.resolve(); // when token not expired
        }
      },
      (_err) => {
        pr.reject({
          sub: _err,
          message: "Error on check AccessTokenExpire",
        });
      },
    );

    return pr.native;
  }

  async _refreshAccessToken() {
    if (!this._isRefreshingToken) {
      this._refreshAccessTokenResolver = new CustomPromise();
      this._isRefreshingToken = true;

      let isNotExit = true;
      while (isNotExit) {
        try {
          log(
            log.INFO,
            `[Character:${this.options.characterId}] Try refreshing token (${this._refreshAccessTokenCount}/${this._refreshAccessTokenMaxCount})`,
          );

          const refreshToken = await this.refreshToken.get();

          const startLoadTime = +new Date();
          const _event = await OAuth.refreshToken(refreshToken);
          const loadingTime = +new Date() - startLoadTime;

          const realExpiresIn =
            +new Date() + _event.expires_in * 1000 - loadingTime;

          await this.realExpiresIn.set(realExpiresIn);
          await this.accessToken.set(_event.access_token);
          await this.refreshToken.set(_event.refresh_token);

          this._isRefreshingToken = false;
          this._refreshAccessTokenResolver.resolve();
          isNotExit = false;

          log(
            log.INFO,
            `[Character:${this.options.characterId}] Token successfully updated`,
          );
        } catch (_err) {
          log(
            log.INFO,
            `[Character:${this.options.characterId}] Error on try refresh token =>`,
            JSON.stringify(_err),
          );
          await waiter(1000);

          if (
            this._refreshAccessTokenCount < this._refreshAccessTokenMaxCount
          ) {
            this._refreshAccessTokenCount++;
          } else {
            isNotExit = false;
            this._isRefreshingToken = false;
            this._refreshAccessTokenResolver.reject();
          }
        }
      }
    }

    return this._refreshAccessTokenResolver.native;
  }

  serverStatusOffline() {
    this.waypoint.serverStatusOffline();
    this.search.serverStatusOffline();

    for (const attrName in this._attributes) {
      this._attributes[attrName].serverStatusOffline();
    }
  }

  serverStatusOnline() {
    this.waypoint.serverStatusOnline();
    this.search.serverStatusOnline();

    for (const attrName in this._attributes) {
      this._attributes[attrName].serverStatusOnline();
    }
  }
}

module.exports = Character;
