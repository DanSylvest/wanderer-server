var Emitter      = require("./../env/tools/emitter");
var classCreator = require("./../env/tools/class");
var promise      = require("./../env/promise");
var md5          = require("md5");

var TokenController = classCreator("TokenController", Emitter, {
    constructor: function TokenController() {
        Emitter.prototype.constructor.call(this);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    generateToken: function (_value) {
        var pr = new promise();

        var tokenId = md5(+new Date + "kek");

        core.dbController.tokensDB.add({
            id: tokenId,
            value: _value,
            expire: new Date(+new Date + 1000 * 60 * 60 * 24)
        }).then(function () {
            pr.resolve(tokenId);
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    checkToken: function (_token) {
        var pr = new promise();

        core.dbController.tokensDB.get(_token, "expire").then(function(_expire) {
            if(!isExpire(_expire)) {
                core.dbController.tokensDB.get(_token, "value").then(function(_value) {
                    pr.resolve(_value)
                }.bind(this),function(_err) {
                    pr.reject(_err);
                }.bind(this));
            } else {
                //todo here need remove expired token
            }
        }.bind(this),function(_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },

});

var isExpire = function (_date) {
    return _date <= new Date();
};

module.exports = TokenController;