/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/22/20.
 */

const Provider        = require("./../../utils/provider");
const classCreator    = require("./../../env/tools/class");
const extend          = require("./../../env/tools/extend");
const log             = require("./../../utils/log");
const request         = require('request');
const CustomPromise   = require("./../../env/promise");

const MAX_TRIES = 5;
const AFTER_BROKEN_TIMEOUT = 1000 * 60 * 30; // we will wait 30 minutes and try again

const TheraProvider = classCreator("TheraProvider", Provider, {
    constructor: function TheraProvider(_options) {
        var base = extend({
            name: "TheraProvider",
            timeout: 60000
        }, _options);

        Provider.prototype.constructor.call(this, base);

        this._triesCount = 0;
        this._restartTimeout = -1;
    },
    destructor () {
        this._restartTimeout !== -1 && clearTimeout(this._restartTimeout);
        this._restartTimeout = -1;

        Provider.prototype.destructor.call(this);
    },
    _sendRequest () {
        theraAPIRequest()
            .then(
                event => {
                    this._notify(event);
                },
                err => {
                    log(log.INFO, `Was next in theraAPI (${this._triesCount}/${MAX_TRIES})`);
                    this._triesCount++;
                    if(this._triesCount >= MAX_TRIES) {
                        this.emit("broken");
                        this._startRestartTimeout()
                        return;
                    }

                    this._next();
                }
            );
    },

    _startRestartTimeout () {
        this._restartTimeout = setTimeout(() => {
            this._restartTimeout = -1;
            this._triesCount = 0;
            this._next();
        }, AFTER_BROKEN_TIMEOUT);
    }
});

const theraAPIRequest = function () {
    let pr = new CustomPromise();

    request.get({url: 'https://www.eve-scout.com/api/wormholes'}, function (error, response, body) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(JSON.parse(body));
    }.bind(this));

    return pr.native;
}




module.exports = TheraProvider;