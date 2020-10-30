var Emitter       = require("./../env/tools/emitter");
var classCreator  = require("./../env/tools/class");
var extend        = require("./../env/tools/extend");
var printf       = require("./../env/tools/print_f");
var CustomPromise = require("./../env/promise");
var DBController  = require("./dbController");
var OAuth         = require("./../core/eveSwaggerInterface/oauth");
var log           = require("./../utils/log");
var md5           = require("md5");

var UserController = classCreator("UserController", Emitter, {
    constructor: function UserController() {
        Emitter.prototype.constructor.call(this);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    registerUserByMailAndPassword: async function (_options) {
        var pr = new CustomPromise();

        var base = extend({
            id: md5(+new Date + config.app.solt),
            mail: "",
            password: ""
        }, _options);

        base.password = md5(base.password);

        try {
            var exists = await core.dbController.userDB.existsByCondition([
                {name: "type", operator: "=", value: 0},
                {name: "mail", operator: "=", value: base.mail},
            ]);

            if (exists) {
                pr.reject({error: 0, message: printf("User %s already exists", base.mail)});
            } else {
                await core.dbController.userDB.add({
                    id: base.id,
                    mail: base.mail,
                    password: base.password,
                    online: false,
                    type: 0
                });
                pr.resolve();
            }

        } catch (_err) {
            throw printf("Unknown error when try create [%s] user", base.mail);
        }

        return pr.native;
    },

    registerUserByEveSSO: async function (_options) {
        var pr = new CustomPromise();

        try {
            var token = null;
            var data = await this._verifyAuthCode(_options.code);

            var existsInUsers = await core.dbController.userDB.existsByCondition([
                {name: "type", operator: "=", value: 1},
                {name: "id", operator: "=", value: data.userData.CharacterID},
            ]);
            var existsInCharacters = await core.dbController.charactersDB.existsByCondition([
                {name: "id", operator: "=", value: data.userData.CharacterID},
            ]);

            if(!existsInUsers && existsInCharacters) {
                // по идее так не должно быть. Это значит что, кто-то пытается зарегиться
                // но уже кто-то этот акк добавил
                pr.reject({
                    err: 0,
                    message: "This character already attached to another User"
                });
            } else if(!existsInUsers && !existsInCharacters) {
                // это значит что ни пользака ни персонажа еще не добавили и надо это сделать
                await this._addCharacter(data);
                await core.dbController.userDB.add({
                    id: data.userData.CharacterID,
                    name: data.userData.CharacterName,
                    mail: "",                           // if we register by eve sso, we don't know mail
                    password: "",                       // if we register by eve sso, we don't know password
                    online: false,
                    type: 1
                });
                await this._boundUserAndCharacter(data.userData.CharacterID, data.userData.CharacterID);
                token = await core.tokenController.generateToken(data.userData.CharacterID);
                pr.resolve(token);
            } else if(existsInUsers && !existsInCharacters) {
                // Если пользователь удалил своего персонажа, по которому, он создавал аккаунт
                await this._addCharacter(data);
                await this._boundUserAndCharacter(data.userData.CharacterID, data.userData.CharacterID);
                token = await core.tokenController.generateToken(data.userData.CharacterID);
                pr.resolve(token);
            } else if(existsInUsers && existsInCharacters) {
                // а если этот вариант, то мы просто авторизуем персонажа
                token = await core.tokenController.generateToken(data.userData.CharacterID);
                pr.resolve(token);
            }

        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },


    loginUserByMailAndPassword: async function (_options) {
        var pr = new CustomPromise();

        var base = extend({
            mail: "",
            password: ""
        }, _options);

        base.password = md5(base.password);

        try {
            var result = await core.dbController.userDB.getByCondition([
                {name: "type", operator: "=", value: 0},
                {name: "mail", operator: "=", value: base.mail},
                {name: "password", operator: "=", value: base.password},
            ], ["id"]);

            var existsInUsers = result.length > 0;

            if(existsInUsers) {
                var token = await core.tokenController.generateToken(result[0].id);
                pr.resolve(token);
            } else {
                pr.reject({
                    error: 1,
                    message: printf("User %s not exist or password incorrect", base.mail)
                });
            }

        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },
    /**
     * here we must notify client about online state change
     *
     * @param _userId
     * @param _bool
     * @returns {*|Promise|Promise<any>|Promise<unknown>}
     */
    setOnline: function (_userId, _bool) {
        var pr = new CustomPromise();

        core.dbController.userDB.set(_userId, "online", _bool).then(function(){
            pr.resolve();
        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    getUserOnline: function (_userId) {
        var pr = new CustomPromise();

        core.dbController.userDB.get(_userId, "online").then(function(_isOnline){
            pr.resolve(_isOnline);
        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },

    getUserCharacters: function (_userId) {
        var pr = new CustomPromise();

        var condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter},
            {name: "first", operator: "=", value: _userId}
        ];

        core.dbController.linksTable.getByCondition(condition, ["second"]).then(function (_result) {
            pr.resolve(_result.map(x => x.second));
        }.bind(this), function (_err) {
            pr.resolve(_err);
        }.bind(this));

        return pr.native;
    },

    getUserName: function (_userId) {
        var pr = new CustomPromise();

        core.dbController.userDB.get(_userId, "name").then(function(_name){
            pr.resolve(_name);
        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },

    _addCharacter: async function (data) {
        var pr = new CustomPromise();
        try {
            var images = await core.esiApi.characters.portrait(data.userData.CharacterID);
            var info = await core.charactersController.get(data.userData.CharacterID).loadPublicCharacterInfo();

            var charProps = {
                id                 : data.userData.CharacterID,
                name               : data.userData.CharacterName,
                expiresOn          : data.userData.ExpiresOn,                      // wherefore it?
                expiresIn          : data.tokenData.expires_in,                    // in seconds
                realExpiresIn      : +new Date + data.tokenData.expires_in * 1000,
                scopes             : data.userData.Scopes,
                characterOwnerHash : data.userData.CharacterOwnerHash,
                accessToken        : data.tokenData.access_token,
                refreshToken       : data.tokenData.refresh_token,
                tokenType          : data.userData.TokenType,
                online             : false,                                   // todo We need request this parameter from ESI
                images             : images,
                infoExpiresIn      : +new Date + (1000 * 60 * 60 * 24),
                info               : info                                     // todo We need get alliance_id and corporation_id
                                                                              // and create special attribute for it. Not big object.
            };

            await core.dbController.charactersDB.add(charProps);

            pr.resolve();
        } catch (_err) {
            pr.reject({sub: _err, message: "Error on load characters data"});
        }

        return pr.native;
    },

    addCharacter: async function (_userId, _code) {
        var pr = new CustomPromise();

        var data = await this._verifyAuthCode(_code);

        if(await this._checkAccountBinding(data.userData.CharacterID)){
            pr.reject({message: printf("Character already attached")});
        } else {
            try {
                var images = await core.esiApi.characters.portrait(data.userData.CharacterID);
                var info = await core.charactersController.get(data.userData.CharacterID).loadPublicCharacterInfo();

                var charProps = {
                    id                 : data.userData.CharacterID,
                    name               : data.userData.CharacterName,
                    expiresOn          : data.userData.ExpiresOn,                      // wherefore it?
                    expiresIn          : data.tokenData.expires_in,                    // in seconds
                    realExpiresIn      : +new Date + data.tokenData.expires_in * 1000,
                    scopes             : data.userData.Scopes,
                    characterOwnerHash : data.userData.CharacterOwnerHash,
                    accessToken        : data.tokenData.access_token,
                    refreshToken       : data.tokenData.refresh_token,
                    tokenType          : data.userData.TokenType,
                    online             : false,                                   // todo We need request this parameter from ESI
                    images             : images,
                    infoExpiresIn      : +new Date + (1000 * 60 * 60 * 24),
                    info               : info                                     // todo We need get alliance_id and corporation_id
                                                                                  // and create special attribute for it. Not big object.
                };

                await core.dbController.charactersDB.add(charProps);
                await this._boundUserAndCharacter(_userId, data.userData.CharacterID);

                pr.resolve();
            } catch (_err) {
                pr.reject({sub: _err, message: "Error on load characters data"});
            }

        }

        return pr.native;
    },


    _verifyAuthCode: function (_code) {
        var pr = new CustomPromise();
        /**
         *
         * @type {{
         *     expires_in: number,
         *     access_token: string,
         *     token_type: string,
         *     refresh_token: string
         * }}
         */
        var tokenData = Object.create(null);

        /**
         *
         * @type {{
         *     CharacterID: number,
         *     CharacterName: string,
         *     ExpiresOn: Date,
         *     Scopes: string,
         *     TokenType: string,
         *     CharacterOwnerHash: string,
         *     IntellectualProperty: string,
         * }}
         */
        var userData = Object.create(null);

        OAuth.token(_code).then(function(_event){
            extend(tokenData, _event);

            // Part second - verify token
            return OAuth.verify(tokenData.access_token);
        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this)).then(function(_event){
            log(log.INFO, printf("SSO_AUTH[2]: got char data: (%s)", _event.CharacterID));
            extend(userData, _event);

            pr.resolve({
                tokenData: tokenData,
                userData: userData,
            })
        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },

    _checkAccountBinding: function (_characterId) {
        var pr = new CustomPromise();

        var condition = [{
            name: "type",
            operator: "=",
            value: DBController.linksTableTypes.userToCharacter
        }, {
            name: "second",
            operator: "=",
            value: _characterId
        }];

        var attributes = [
            "first"
        ];

        core.dbController.linksTable.getByCondition(condition, attributes).then(function (_result) {
            pr.resolve(_result.length > 0);
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },

    _boundUserAndCharacter : function (_userName, _characterId) {
        var pr = new CustomPromise();

        var condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter},
            {name: "first", operator: "=", value: _userName},
            {name: "second", operator: "=", value: _characterId},
        ];

        var attributes = [
            "first",
            "second"
        ];

        core.dbController.linksTable.getByCondition(condition, attributes).then(function (_arr) {
            if(_arr.length !== 0) {
                pr.reject({
                    message: printf("Character %s already attached to user %", _characterId, _userName)
                });
                return;
            }

            return core.dbController.linksTable.add({
                type: DBController.linksTableTypes.userToCharacter,
                first: _userName,
                second: _characterId
            });
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this)).then(function() {
            pr.resolve();
        }.bind(this),function(_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    isCharacterAttachedToUser: async function (_characterId, _userId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter},
            {name: "first", operator: "=", value: _userId},
            {name: "second", operator: "=", value: _characterId},
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.length === 1;
    }
});

module.exports = UserController;