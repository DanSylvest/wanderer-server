/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/22/20.
 */

const Provider = require("../../utils/_new/provider");
const extend = require("../../env/tools/extend");
const log = require("../../utils/log");

// {"error":"Timeout contacting tranquility","timeout":10}
class Location extends Provider {
  constructor(_options) {
    super(
      extend(
        {
          name: "statusObserver",
          timeout: 20000,
        },
        _options,
      ),
    );
  }

  _sendRequest() {
    core.esiApi.status().then(
      (event) => {
        this._notify({
          online: event.online,
          players: event.players,
          server_version: event.server_version,
          start_time: event.start_time,
          vip: event.vip,
        });
      },
      (err) => {
        if (err.errno === -3001) {
          // when EAI_AGAIN
          this._notify({
            online: false,
            players: 0,
            server_version: "",
            start_time: "",
            vip: false,
          });
        } else {
          log(log.INFO, "Was next in StatusObserver");
          this._next();
        }
      },
    );
  }
}

module.exports = Location;
