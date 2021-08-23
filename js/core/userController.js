const DBController = require("./dbController");
const OAuth = require("./../esi/oauth.js");
const log = require("./../utils/log");
const MultiObject = require("./../env/multiObject");
const Emitter = require("./../env/_new/tools/emitter");

class UserController extends Emitter{
    _usersOnline = Object.create(null);
    userAtConnection = new MultiObject();

    constructor () {
        super();
    }

    destructor () {
        super.destructor();
    }

    async registerUserByEveSSO (code) {
        let data = await this._verifyAuthCode(code);

        let existsInUsers = await core.dbController.userDB.existsByCondition([
            { name: "type", operator: "=", value: 1 },
            { name: "id", operator: "=", value: data.userData.CharacterID },
        ]);
        let existsInCharacters = await core.dbController.charactersDB.existsByCondition([
            { name: "id", operator: "=", value: data.userData.CharacterID },
        ]);

        if (!existsInUsers && existsInCharacters) {
            let userId = await this.getUserByCharacter(data.userData.CharacterID.toString());
            return await core.tokenController.generateToken(userId);

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
    }

    /**
     * here we must notify client about online state change
     *
     * @param _userId
     * @param _bool
     * @returns {*|Promise|Promise<any>|Promise<unknown>}
     */
    setOnline (_userId, _bool) {
        this._usersOnline[_userId] = _bool;
    }

    getUserOnline (_userId) {
        return this._usersOnline[_userId] || false;
    }

    async getUserCharacters (_userId) {
        let condition = [
            { name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter },
            { name: "first", operator: "=", value: _userId }
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["second"]);
        return result.map(x => x.second);
    }

    async getUserName (_userId) {
        return await core.dbController.userDB.get(_userId, "name");
    }

    async _addCharacter (data) {
        const {
            CharacterID: id,
            CharacterName: name,
            ExpiresOn: expiresOn,                    // wherefore it?
            CharacterOwnerHash: characterOwnerHash,
            TokenType: tokenType,
        } = data.userData;

        const {
            expires_in: expiresIn,                   // in seconds
            access_token: accessToken,
            refresh_token: refreshToken,
        } = data.tokenData;

        const charProps = {
            id,
            name,
            expiresOn,
            expiresIn,
            realExpiresIn: +new Date + expiresIn * 1000,
            // scopes: data.userData.Scopes,
            characterOwnerHash,
            accessToken,
            refreshToken,
            tokenType,
            online: false,
            // infoExpiresIn: +new Date + (1000 * 60 * 60 * 24),
        };

        await core.dbController.charactersDB.add(charProps);
    }

    async _refreshCharacter (data) {
        const {
            CharacterID: id,
            ExpiresOn: expiresOn,                    // wherefore it?
            CharacterOwnerHash: characterOwnerHash,
        } = data.userData;

        const {
            expires_in: expiresIn,                   // in seconds
            access_token: accessToken,
            refresh_token: refreshToken,
        } = data.tokenData;

        const charProps = {
            expiresOn,
            expiresIn,
            realExpiresIn: +new Date + expiresIn * 1000,
            characterOwnerHash,
            accessToken,
            refreshToken
        };

        let condition = [
            { name: "id", operator: "=", value: id },
        ];

        await core.dbController.charactersDB.setByCondition(condition, charProps);
    }

    async addCharacter (_userId, _code) {
        let data = await this._verifyAuthCode(_code);
        const { CharacterID } = data.userData;

        if (await this._checkAccountBinding(CharacterID)) {
            throw { message: `Character ${CharacterID} already attached` };
        } else {
            await this._addCharacter(data);
            await this._boundUserAndCharacter(_userId, CharacterID);
        }
    }

    async refreshCharacter (_userId, _code) {
        let data = await this._verifyAuthCode(_code);
        const { CharacterID } = data.userData;

        if (!await this._checkAccountBinding(CharacterID)) {
            throw { message: `Character ${CharacterID} can not be updated` };
        } else {
            await this._refreshCharacter(data);
        }
    }

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
        const tokenData = await OAuth.token(_code);

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
        const userData = await OAuth.verify(tokenData.access_token);
        log(log.INFO, `SSO_AUTH[2]: got char data: (${userData.CharacterID})`);

        return { tokenData, userData };
    }

    async _checkAccountBinding (_characterId) {
        let condition = {
            left: { name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter },
            operator: "AND",
            right: { name: "second", operator: "=", value: _characterId }
        }

        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.length > 0;
    }

    async _boundUserAndCharacter (_userName, _characterId) {
        let condition = [
            { name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter },
            { name: "first", operator: "=", value: _userName },
            { name: "second", operator: "=", value: _characterId },
        ];

        let result = await core.dbController.linksTable.getByCondition(condition, ["first", "second"]);
        if (result.length !== 0) {
            throw { message: `Character ${_characterId} already attached to user ${_userName}` }
        }

        await core.dbController.linksTable.add({
            type: DBController.linksTableTypes.userToCharacter,
            first: _userName,
            second: _characterId
        });
    }

    async isCharacterAttachedToUser (_characterId, _userId) {
        let condition = [
            { name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter },
            { name: "first", operator: "=", value: _userId },
            { name: "second", operator: "=", value: _characterId },
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.length === 1;
    }

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
        if (!isOnline) {
            this.setOnline(userId, true);
            log(log.INFO, `User [${userId}] was log in on server.`);
        } else {
            // await core.mapController.updateAllUserMapWatchStatuses(connectionId, userId);
        }
    }

    async updateUserOfflineStatus (connectionId, token) {
        let userId = await core.tokenController.checkToken(token);
        let isOnline = this.getUserOnline(userId);

        if (this.userAtConnection.has(userId, connectionId)) {
            // todo тут надо сбрасывать тоже
            await core.mapController.dropCharsFromMapsByUserAndConnection(userId, connectionId);

            let count = this.userAtConnection.delete(userId, connectionId);
            if (isOnline && count === 0) {
                core.mapController.userOffline(userId);
                log(log.INFO, `User [${userId}] was disconnected from server.`);
            }
        }
        core.connectionStorage.del(connectionId);
    }

    /**
     *
     * @param {string} characterId
     * @returns {Promise<string|null>}
     */
    async getUserByCharacter (characterId) {
        let condition = [
            { name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter },
            { name: "second", operator: "=", value: characterId },
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.length > 0 ? result[0].first : null;
    }

    /**
     *
     * @param {Array<String>} characters
     * @returns {Promise<string|null>}
     */
    async getUsersByCharacters (characters) {
        let out = [];
        if (characters.length > 0) {
            let condition = {
                left: { name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter },
                operator: "AND",
                right: {
                    operator: "OR",
                    condition: characters.map(characterId => ({ name: "second", operator: "=", value: characterId }))
                }
            };
            let result = await core.dbController.linksTable.getByCondition(condition, ["first", "second"]);
            out = result.map(x => ({ characterId: x.second, userId: x.first }));
        }
        return out;
    }
}

module.exports = UserController;
