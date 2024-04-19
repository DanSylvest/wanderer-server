/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/22/20.
 */

const Provider = require("../../utils/provider");
const classCreator = require("../../env/tools/class");
const extend = require("../../env/tools/extend");
const log = require("../../utils/log");

const Online = classCreator("Online", Provider, {
  constructor: function Online(_options) {
    const base = extend(
      {
        /** @type Number - this is a character identifier */
        characterId: null,
        name: "onlineObserver",
        timeout: 10000,
      },
      _options,
    );

    Provider.prototype.constructor.call(this, base);
  },
  _sendRequest() {
    core.esiApi.location.online(this._token, this.options.characterId).then(
      (_event) => {
        this._notify(_event.online);
      },
      () => {
        log(log.INFO, "Was next in Online for %s", this.options.characterId);
        this._next();
      },
    );
  },
});

module.exports = Online;
