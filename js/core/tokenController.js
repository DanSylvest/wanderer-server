var Emitter       = require("./../env/_new/tools/emitter");
var CustomPromise = require("./../env/promise");
var md5           = require("md5");
const exist       = require("./../env/tools/exist");

// TODO вычищать нафиг все просроченные токены на каждый старт
class TokenController extends Emitter {
    async generateToken(_value, expire) {
        let pr = new CustomPromise();
        let tokenId = md5(+new Date + config.tokens.solt);
        let expireDate = new Date(exist(expire) ? expire : (+new Date) + config.tokens.lifeTime);

        try {
            await core.dbController.tokensDB.add({id: tokenId, value: _value, expire: expireDate});
            pr.resolve(tokenId);
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    }

    async checkToken(_token) {
        let pr = new CustomPromise();

        try {
            let isExists = await core.dbController.tokensDB.existsByCondition([
                {name: "id", operator: "=", value: _token},
            ]);

            if (isExists) {
                let expire = await core.dbController.tokensDB.get(_token, "expire");
                if (!isExpire(expire)) {
                    let value = await core.dbController.tokensDB.get(_token, "value");
                    pr.resolve(value);
                } else {
                    await core.dbController.tokensDB.remove(_token);
                    pr.reject("token is expired");
                }
            } else {
                pr.reject("token is not exists");
            }
        } catch (err) {
            pr.reject(err);
        }

        return pr.native;
    }

    async removeToken(token) {
        let isExists = await core.dbController.tokensDB.existsByCondition([
            {name: "id", operator: "=", value: token},
        ]);

        if (isExists)
            await core.dbController.tokensDB.remove(token);
        else
            throw "Token already removed";
    }
}

var isExpire = function (_date) {
    return _date <= new Date();
};

module.exports = TokenController;