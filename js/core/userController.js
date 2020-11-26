const Emitter       = require("./../env/tools/emitter");
const classCreator  = require("./../env/tools/class");
const extend        = require("./../env/tools/extend");
const DBController  = require("./dbController");
const OAuth         = require("./../core/eveSwaggerInterface/oauth");
const log           = require("./../utils/log");
const md5           = require("md5");
const MultiObject   = require("./../env/multiObject")

const UserController = classCreator("UserController", Emitter, {
    constructor: function UserController() {
        Emitter.prototype.constructor.call(this);

        this._usersOnline = Object.create(null);
        this.userAtConnection = new MultiObject();
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    async registerUserByMailAndPassword (_options) {
        let base = extend({
            id: md5(+new Date + config.app.solt),
            mail: "",
            password: ""
        }, _options);

        base.password = md5(base.password);

        let exists = await core.dbController.userDB.existsByCondition([
            {name: "type", operator: "=", value: 0},
            {name: "mail", operator: "=", value: base.mail},
        ]);

        if (exists) {
            throw {error: 0, message: `User ${base.mail} already exists`};
        } else {
            await core.dbController.userDB.add({
                id: base.id,
                mail: base.mail,
                password: base.password,
                online: false,
                type: 0
            });
        }
    },
    async registerUserByEveSSO (_options) {
        let data = await this._verifyAuthCode(_options.code);

        let existsInUsers = await core.dbController.userDB.existsByCondition([
            {name: "type", operator: "=", value: 1},
            {name: "id", operator: "=", value: data.userData.CharacterID},
        ]);
        let existsInCharacters = await core.dbController.charactersDB.existsByCondition([
            {name: "id", operator: "=", value: data.userData.CharacterID},
        ]);

        if (!existsInUsers && existsInCharacters) {
            // по идее так не должно быть. Это значит что, кто-то пытается зарегиться
            // но уже кто-то этот акк добавил
            throw {
                err: 0,
                message: "This character already attached to another User"
            };
        } else if (!existsInUsers && !existsInCharacters) {
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
            return await core.tokenController.generateToken(data.userData.CharacterID);
        } else if (existsInUsers && !existsInCharacters) {
            // Если пользователь удалил своего персонажа, по которому, он создавал аккаунт
            await this._addCharacter(data);
            await this._boundUserAndCharacter(data.userData.CharacterID, data.userData.CharacterID);
            return await core.tokenController.generateToken(data.userData.CharacterID);
        } else if (existsInUsers && existsInCharacters) {
            // а если этот вариант, то мы просто авторизуем персонажа
            return await core.tokenController.generateToken(data.userData.CharacterID);
        }
    },
    // todo this is deprecated
    async loginUserByMailAndPassword (_options) {
        let base = extend({
            mail: "",
            password: ""
        }, _options);

        base.password = md5(base.password);

        let result = await core.dbController.userDB.getByCondition([
            {name: "type", operator: "=", value: 0},
            {name: "mail", operator: "=", value: base.mail},
            {name: "password", operator: "=", value: base.password},
        ], ["id"]);

        let existsInUsers = result.length > 0;
        if (existsInUsers) {
            return await core.tokenController.generateToken(result[0].id);
        } else {
            throw {
                error: 1,
                message: `User ${base.mail} not exist or password incorrect`
            };
        }
    },
    /**
     * here we must notify client about online state change
     *
     * @param _userId
     * @param _bool
     * @returns {*|Promise|Promise<any>|Promise<unknown>}
     */
    setOnline (_userId, _bool) {
        this._usersOnline[_userId] = _bool;
    },
    getUserOnline (_userId) {
        return this._usersOnline[_userId] || false;
    },
    async getUserCharacters (_userId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter},
            {name: "first", operator: "=", value: _userId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["second"]);
        return result.map(x => x.second);
    },
    async getUserName (_userId) {
        return await core.dbController.userDB.get(_userId, "name");
    },
    async _addCharacter (data) {
        // todo все запросы к евке надо как-то так оборачивать, что бы оно не ломало ничего...
        // а еще нафиг не нужно запрашивать портреты для персонажей, т.к. можно портрет по иду отображать...
        // а еще надо проверять что евка вообще жива, а еще может быть разрыв соединения.
        // а еще может быть таймаут... жопа короче
        let images = await core.esiApi.characters.portrait(data.userData.CharacterID);
        let info = await core.charactersController.get(data.userData.CharacterID).loadPublicCharacterInfo();

        let charProps = {
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
    },
    async addCharacter (_userId, _code) {
        let data = await this._verifyAuthCode(_code);

        if(await this._checkAccountBinding(data.userData.CharacterID)){
            throw {message: `Character ${data.userData.CharacterID} already attached`};
        } else {
            // todo все запросы к евке надо как-то так оборачивать, что бы оно не ломало ничего...
            let images = await core.esiApi.characters.portrait(data.userData.CharacterID);
            let info = await core.charactersController.get(data.userData.CharacterID).loadPublicCharacterInfo();

            let charProps = {
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
        }
    },
    async _verifyAuthCode (_code) {
        /**
         *
         * @type {{
         *     expires_in: number,
         *     access_token: string,
         *     token_type: string,
         *     refresh_token: string
         * }}
         */
        let tokenData = await OAuth.token(_code);

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
        let userData = await OAuth.verify(tokenData.access_token);
        log(log.INFO, `SSO_AUTH[2]: got char data: (${userData.CharacterID})`);

        return {
            tokenData: tokenData,
            userData: userData,
        };
    },
    async _checkAccountBinding (_characterId) {
        let condition = {
            left: {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter},
            operator: "AND",
            right: {name: "second", operator: "=", value: _characterId}
        }

        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.length > 0;
    },
    async _boundUserAndCharacter (_userName, _characterId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter},
            {name: "first", operator: "=", value: _userName},
            {name: "second", operator: "=", value: _characterId},
        ];

        let result = await core.dbController.linksTable.getByCondition(condition, ["first","second"]);
        if(result.length !== 0) {
            throw {message: `Character ${_characterId} already attached to user ${_userName}`}
        }

        await core.dbController.linksTable.add({
            type: DBController.linksTableTypes.userToCharacter,
            first: _userName,
            second: _characterId
        });
    },
    async isCharacterAttachedToUser (_characterId, _userId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter},
            {name: "first", operator: "=", value: _userId},
            {name: "second", operator: "=", value: _characterId},
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.length === 1;
    },
    async updateUserOnlineStatus (connectionId, token) {
        // we need check that this user already is online
        // after...
        // if user is not online then set online
        // if user is online then do nothing and add token and connections

        let userId = await core.tokenController.checkToken(token);
        core.connectionStorage.set(connectionId, token);
        this.userAtConnection.update(userId, connectionId);

        let isOnline = this.getUserOnline(userId);
        core.mapController.userOnline(userId);

        // Это происходит, когда мы подключились. Это значит что и конекшн новый
        // Так же это значит, что пользак все еще онлайн его не надо заного заставлять быть в онлайне
        // В противном случае, когда пользак не онлайн, никуда ничего не надо переставлять,
        // В силу того, что дальше должен будет отработать выбор карты, и этот запрос сам всё сделает
        if(!isOnline) {
            this.setOnline(userId, true);
            log(log.INFO, `User [${userId}] was log in on server.`);
        } else {
            // await core.mapController.updateAllUserMapWatchStatuses(connectionId, userId);
        }
    },
    async updateUserOfflineStatus (connectionId, token) {
        let userId = await core.tokenController.checkToken(token);
        let isOnline = this.getUserOnline(userId);

        if(this.userAtConnection.has(userId, connectionId)) {
            // todo тут надо сбрасывать тоже
            await core.mapController.dropCharsFromMapsByUserAndConnection(userId, connectionId);

            let count = this.userAtConnection.delete(userId, connectionId);
            if (isOnline && count === 0) {
                core.mapController.userOffline(userId);
                log(log.INFO, `User [${userId}] was disconnected from server.`);
            }
        }
        core.connectionStorage.del(connectionId);
    },
    /**
     *
     * @param {string} characterId
     * @returns {Promise<string|null>}
     */
    async getUserByCharacter (characterId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter},
            {name: "second", operator: "=", value: characterId},
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.length > 0 ? result[0].first : null;
    },
    /**
     *
     * @param {string} characterId
     * @returns {Promise<string|null>}
     */
    async getUsersByCharacters (characters) {
        let condition = {
            left: {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter},
            operator: "AND",
            right: {
                operator: "OR",
                condition: characters.map(characterId => ({name: "second", operator: "=", value: characterId}))
            }
        };
        let result = await core.dbController.linksTable.getByCondition(condition, ["first", "second"]);
        return result.map(x => ({characterId: x.second, userId: x.first}));
    }
});

module.exports = UserController;
