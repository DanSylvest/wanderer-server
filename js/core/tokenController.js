const md5 = require("md5");
const Emitter = require("../env/_new/tools/emitter");
const CustomPromise = require("../env/promise");
const exist = require("../env/tools/exist");

// TODO вычищать нафиг все просроченные токены на каждый старт
class TokenController extends Emitter {
  async generateToken(_value, expire) {
    const pr = new CustomPromise();
    const tokenId = md5(+new Date() + config.tokens.solt);
    const expireDate = new Date(
      exist(expire) ? expire : +new Date() + config.tokens.lifeTime,
    );

    try {
      await core.dbController.tokensDB.add({
        id: tokenId,
        value: _value,
        expire: expireDate,
      });
      pr.resolve(tokenId);
    } catch (_err) {
      pr.reject(_err);
    }

    return pr.native;
  }

  async checkToken(_token) {
    const pr = new CustomPromise();

    try {
      const isExists = await core.dbController.tokensDB.existsByCondition([
        { name: "id", operator: "=", value: _token },
      ]);

      if (isExists) {
        const expire = await core.dbController.tokensDB.get(_token, "expire");
        if (!isExpire(expire)) {
          const value = await core.dbController.tokensDB.get(_token, "value");
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
    const isExists = await core.dbController.tokensDB.existsByCondition([
      { name: "id", operator: "=", value: token },
    ]);

    if (isExists) await core.dbController.tokensDB.remove(token);
    else throw "Token already removed";
  }
}

const isExpire = function (_date) {
  return _date <= new Date();
};

module.exports = TokenController;
