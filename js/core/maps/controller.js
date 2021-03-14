/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/21/20.
 */

const Emitter           = require("./../../env/tools/emitter");
const classCreator      = require("./../../env/tools/class");
const log               = require("./../../utils/log");
const DBController      = require("./../dbController");
const Map               = require("./map");
const md5               = require("md5");
const UserMapWatcher    = require("./userMapWatcher.js");
const UserSubscriptions = require("./userSubscriptions.js");
const mapSqlActions     = require("./sql/mapSqlActions.js");

const USER_DROP_TIMEOUT = 10000;

const MapController = classCreator("MapController", Emitter, {
    constructor: function MapController() {
        Emitter.prototype.constructor.call(this);

        this._maps = Object.create(null);
        this._onlineUsers = Object.create(null);
        this._umw = new UserMapWatcher();
        this._us = new UserSubscriptions();
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },

    init: async function () {
        let allMaps = await this.getAllMaps();
        await Promise.all(allMaps.map(_map => this.get(_map.id).init()));
    },

    // Controller API
    has: function (_mapId) {
        return !!this._maps[_mapId];
    },
    get: function (_mapId) {
        if(!this.has(_mapId)) {
            this._add(_mapId, new Map({mapId:_mapId}));
        }

        return this._maps[_mapId];
    },
    remove: function (_mapId) {
        if(this.has(_mapId)){
            this._maps[_mapId].deinit();
            delete this._maps[_mapId];
        }
    },
    _add: function (_mapId, _mapInstance) {
        this._maps[_mapId] = _mapInstance;
    },
    async connectionBreak (_connectionId) {
        for(let mapId in this._maps) {
            this._maps[mapId].connectionBreak(_connectionId);
        }
    },

    removeCharactersFromObserve (_mapId, _characters) {
        if(this._maps[_mapId]) {
            this._maps[_mapId].removeCharactersFromObserve(_characters);
        }
    },
    userOffline (_userId) {
        this._onlineUsers[_userId].tid = setTimeout(async function (_userId) {
            this._onlineUsers[_userId].tid = -1;
            this._onlineUsers[_userId].online = false;
            this._userOffline(_userId);
            await core.userController.setOnline(_userId, false);
        }.bind(this, _userId), USER_DROP_TIMEOUT);
    },
    _userOffline (userId) {
        this._umw.removeUser(userId);
        this._us.removeUser(userId);

        delete this._onlineUsers[userId];

        log(log.INFO, "User [%s] now is offline.", userId);
    },
    userOnline (_userId) {
        if(!this._onlineUsers[_userId]) {
            this._onlineUsers[_userId] = {
                online: true,
                tid: -1
            }
        } else if(this._onlineUsers[_userId].tid !== -1) {
            clearTimeout(this._onlineUsers[_userId].tid);
            this._onlineUsers[_userId].tid = -1;
            this._onlineUsers[_userId].online = true;
            return;
        }
        log(log.INFO, "User [%s] now is online.", _userId);
    },
    async updateCharacterTrackStatus (maps, characterId, state) {
        let userId = await core.userController.getUserByCharacter(characterId);

        // Получаем все группы, на которых персонаж поставлен на отслеживание
        let groups = await core.groupsController.getGroupsByTrackedCharacterId(characterId);
        // groups = groups.filter(x => x !== groupId);

        // Загружаем все карты, для которых данная группа присоеденена
        // /** @type {Array<Array<mapId>>} */
        let arr = await Promise.all(groups.map(x => this.getMapsByGroup(x)));

        // Все карты, которые по другим группам отслеживаются
        // {Array<mapId>}
        let otherMapsWhereUserTracking = [];
        arr.map(x => otherMapsWhereUserTracking.merge(x));
        let mapsObj = otherMapsWhereUserTracking.convertToMap();

        if(state) {
            for (let a = 0; a < maps.length; a++) {
                let mapId = maps[a];
                let isWatchingOnMap = this.has(mapId) && this._umw.isUserWatchOnMap(userId, mapId);
                isWatchingOnMap && this.get(mapId).addCharactersToObserve([characterId]);
            }
        } else if(!state) {
            for (let a = 0; a < maps.length; a++) {
                let mapId = maps[a];
                let isWatchingOnMap = this.has(mapId) && this._umw.isUserWatchOnMap(userId, mapId);

                if(isWatchingOnMap && !mapsObj[mapId]) {
                    this.get(mapId).removeCharactersFromObserve([characterId]);
                }
            }
        }
    },
    async getMapsByGroupsWithCharacters (_input) {
        let prarr = [];
        let infoGroups = [];
        for (let groupId in _input) {
            infoGroups.push({groupId: groupId, characterIds: _input[groupId]});
            prarr.push(this.getMapsByGroup(groupId));
        }

        // Получаем массив идентификаторов карт
        let arrMapIds = await Promise.all(prarr);

        // Разложим персонажей по картам
        let filteredMaps = Object.create(null);
        for (let a = 0; a < arrMapIds.length; a++) {
            let mapIds = arrMapIds[a];
            let groupInfo = infoGroups[a];

            for (let b = 0; b < mapIds.length; b++) {
                let mapId = mapIds[b];

                if (!filteredMaps[mapId]) {
                    filteredMaps[mapId] = []
                }
                filteredMaps[mapId].merge(groupInfo.characterIds);
            }
        }

        return filteredMaps;
    },
    async _updateGroups (_mapId, _groups) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.mapToGroups},
            {name: "first", operator: "=", value: _mapId}
        ];

        let result = await core.dbController.linksTable.getByCondition(condition, ["first", "second"]);

        let added = [], removed = [], transactionArr = [];
        for (let a = 0; a < _groups.length; a++) {
            if (result.searchByObjectKey("second", _groups[a]) === null) {
                transactionArr.push(core.dbController.linksTable.add({
                    type: DBController.linksTableTypes.mapToGroups,
                    first: _mapId,
                    second: _groups[a]
                }, true));
                added.push(_groups[a]);
            }
        }

        for (let b = 0; b < result.length; b++) {
            if (_groups.indexOf(result[b].second) === -1) {
                transactionArr.push(core.dbController.linksTable.removeByCondition([
                    {name: "type", operator: "=", value: DBController.linksTableTypes.mapToGroups},
                    {name: "first", operator: "=", value: _mapId},
                    {name: "second", operator: "=", value: result[b].second},
                ], true));
                removed.push(result[b].second);
            }
        }

        await core.dbController.db.transaction(transactionArr);
        return {added: added, removed: removed};
    },
    async actualizeOfflineCharactersForMaps (maps, characters) {
        await Promise.all(characters.map(characterId => this.updateCharacterTrackStatus(maps, characterId, false)));
    },
    async actualizeOnlineCharactersForMaps (maps, characters) {
        await Promise.all(characters.map(characterId => this.updateCharacterTrackStatus(maps, characterId, false)));
    },

    async addChainManual (owner, mapId, sourceSolarSystemId, targetSolarSystemId) {
        let map = this.get(mapId);
        await map.addChainManual(sourceSolarSystemId, targetSolarSystemId);
    },

    /**
     *
     * @param _owner - is mapper user id
     * @param _data {{}}
     * @param _data.name {string}
     * @param _data.description {string}
     * @param _data.groups {Array<string>}
     * @returns {Promise<any> | Promise<unknown>}
     */
    async createMap (_owner, _data) {
        let id = md5(config.app.solt + "_" + +new Date);

        let props = {
            id: id,
            owner: _owner,
            name: _data.name,
            description: _data.description
        };

        await core.dbController.mapsDB.add(props);
        await this._updateGroups(id, _data.groups);
        await this.notifyAllowedMapsByMap(id);

        return id;
    },
    /**
     *
     * @param _mapId
     * @param _props
     * @returns {Promise<void>}
     */
    async editMap (_mapId, _props) {
        // todo Тут наверно надо сделать очередь на редактирование.
        // нельзя что бы эдитилось сразу 2 карты...
        // хз надо об этом подумать

        let oldGroups = await this.getMapGroups(_mapId);
        let result = await this._updateGroups(_mapId, _props.groups);

        // персонажей надо добавлять в онлайн только при условии, что у карты были хотя бы
        // какие-то группы, т.к. если их не было, то смотреть на карту невозможно
        if (oldGroups.length !== 0) {
            if (result.added.length > 0) {
                let charsArr = await Promise.all(result.added.map(groupId => core.groupsController.getTrackedCharactersByGroup(groupId)));
                let characters = [];
                charsArr.map(x => characters.merge(x));
                await Promise.all(characters.map(characterId => this.updateCharacterTrackStatus([_mapId], characterId, true)));
            }

            if (result.removed.length > 0) {
                let charsArr = await Promise.all(result.removed.map(groupId => core.groupsController.getTrackedCharactersByGroup(groupId)));
                let characters = [];
                charsArr.map(x => characters.merge(x));
                await Promise.all(characters.map(characterId => this.updateCharacterTrackStatus([_mapId], characterId, false)));
            }
        }

        delete _props.groups;
        await core.dbController.mapsDB.set(_mapId, _props);

        await this.notifyAllowedMapsByMap(_mapId);
    },


    /**
     * А ведь это не так тривиально как кажется, да?
     *  - удалить все слинкоанные с картой группы
     *  - удалить сам объект карты (но это просто остановка работы механизма карты)
     *  - удалить из бд mapLinksTable все линки
     *  - удалить из бд mapSystemsTable все системы с их параметрами
     *  - удалить из бд mapSystemToCharacterTable связи персонажей с картой
     *  - оповестить всех кто смотрит на карту, что она была удалена
     * @param _mapId
     * @returns {Promise<unknown>}
     */
    async removeMap (_mapId) {
        await mapSqlActions.removeMap(_mapId);
        await mapSqlActions.unlinkMapGroups(_mapId);

        this._umw.removeMapFromAllUsers(_mapId);
        this.remove(_mapId);

        await this.notifyAllowedMapsByMap(_mapId);
    },
    /**
     * @param {string} userId
     * @param {Object} data
     * @param {String} data.name
     * @param {String} data.description
     * @param {Boolean} data.shareForCorporation
     * @param {Boolean} data.shareForAlliance
     * @param {Number} data.characterId
     * @returns {*}
     */
    async createMapFast (userId, data) {
        // todo надо получить локальные данные о персонаже
        // т.е. этот персонаж, полюбому есть в базе данных, и информация о его корпорации имеется
        // наверно надо сделать какое-то хранилище, в котором указано последнее время обновления в базе данных
        // и через него запрашивать инфу.
        // т.е. например
        // мы запрашиваем данные о персонаже
        // проверяем, есть ли эти данные в локальном кеше программы
        // если есть проверяем когда протухает
        // если протухло, то если ева работает, запускаем обновление
        // если не протухло - сразу возвращаем
        // если данных нет в локальном кеше, то лезем в базу данных, и сразу спрашиваем, а протухло ли.
        // если протухло... короче надо сделать механизм, доступа к данным, с кешированием, протуханием и обновлением...
        // а то жопаговно
        let charInfo = await core.charactersController.get(data.characterId).getInfo();
        let groupOptions = {
            name: `group_${data.name}`,
            description: `Automatically generated group for map ${data.name}`,
            characters: [data.characterId]
        }

        if(data.shareForCorporation) {
            groupOptions.corporations = [charInfo.corporationId];
        }

        if(data.shareForAlliance) {
            groupOptions.alliances = [charInfo.allianceId];
        }

        let lastCreatedGroupId = await core.groupsController.createGroup(userId, groupOptions);
        await core.groupsController.updateCharacterTrack(lastCreatedGroupId, data.characterId, true);

        let lastCreatedMapId = await this.createMap(userId, {
            name: data.name,
            description: data.description,
            groups: [lastCreatedGroupId]
        });

        await this.notifyAllowedMapsByMap(lastCreatedMapId);

        return {
            mapId: lastCreatedMapId,
            groups: [lastCreatedGroupId],
            description: data.description,
            name: data.name
        };
    },

    async notifyAllowedMapsByAffectedCharacters (characters) {
        let usersOnCharacters = await core.userController.getUsersByCharacters(characters);
        let usersObj = Object.create(null);
        usersOnCharacters.map(x => usersObj[x.userId] = true);
        let users = Object.keys(usersObj);
        await Promise.all(users.map(userId => this.notifyAllowedMapsByUser(userId)));
    },
    async notifyAllowedMapsByUser (userId) {
        if(this._us.getUser(userId).allowedMaps.notify) {
            let lastUpdatedMaps = this._us.getUser(userId).allowedMaps.getData(); // было
            let allowedMaps = await this.getMapsWhereCharacterTrackByUser(userId); // стало

            let diff = lastUpdatedMaps.diff(allowedMaps);

            if(diff.added.length > 0) {
                diff.added.map(x => lastUpdatedMaps.push(x));
                this._us.getUser(userId).allowedMaps.subscription.notify({
                    type: "added",
                    maps: diff.added
                });
            }

            if(diff.removed.length > 0) {
                diff.removed.map(x => lastUpdatedMaps.removeByValue(x));
                this._us.getUser(userId).allowedMaps.subscription.notify({
                    type: "removed",
                    maps: diff.removed
                });
            }
        }
    },
    async notifyAllowedMapsByMap (mapId) {
        let users = this._us.getUsers();
        users = users.filter(userId => this._us.getUser(userId).allowedMaps.notify);

        let charsArr = await Promise.all(users.map(userId => this.getTrackingCharactersForMapByUser(mapId, userId)));

        users.map((userId, index) => {
            let hasTrackedCharacters = charsArr[index].length > 0;
            let lastUpdatedMaps = this._us.getUser(userId).allowedMaps.getData();
            let hasMap = lastUpdatedMaps.indexOf(mapId) !== -1;

            if(hasMap && !hasTrackedCharacters) {
                lastUpdatedMaps.removeByValue(mapId);
                this._us.getUser(userId).allowedMaps.subscription.notify({
                    type: "removed",
                    maps: [mapId]
                });
            } else if(!hasMap && hasTrackedCharacters) {
                lastUpdatedMaps.push(mapId);
                this._us.getUser(userId).allowedMaps.subscription.notify({
                    type: "added",
                    maps: [mapId]
                });
            }
        });
    },
    async getMapListByOwner (_ownerId) {
        let condition = [{name: "owner", operator: "=", value: _ownerId}];
        let attributes = ["id", "name", "description", "owner"];

        let mapListPr = core.dbController.mapsDB.getByCondition(condition, attributes);
        let userNamePr = core.userController.getUserName(_ownerId);

        let mapList = await mapListPr;
        let userName = await userNamePr;
        let mapsGroups = await Promise.all(mapList.map(_mapInfo => this.getMapGroups(_mapInfo.id)));

        for (let a = 0; a < mapList.length; a++) {
            mapList[a].groups = mapsGroups[a];
            mapList[a].owner = userName;
        }

        return mapList
    },
    async getMapInfo (_mapId) {
        return await core.dbController.mapsDB.get(_mapId, core.dbController.mapsDB.attributes());
    },
    async getMapGroups (mapId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.mapToGroups},
            {name: "first", operator: "=", value: mapId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["second"]);
        return result.map(x => x.second);
    },

    async getMapsByGroup (_groupId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.mapToGroups},
            {name: "second", operator: "=", value: _groupId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"])
        return result.map(x => x.first);
    },
    async getAllMaps () {
        return await core.dbController.mapsDB.all();
    },
    async setMapWatchStatus (connectionId, userId, mapId, status) {
        // Если текущий статус слежения за картой, выставлен в тру.
        if(status) {
            // Если нет слежения по текущему конекшну то создадим новый
            this._umw.addConnection(userId, connectionId);

            // Для всех карт пройдемся и зададим значение в false
            let prarr = [];
            this._umw.eachMap(userId, connectionId, (_mapId, _isWatch) => {
                if(_isWatch) {
                    this._umw.set(userId, connectionId, _mapId, false);

                    // Пользователь может с разных вкладок смотреть на разные карты
                    // При открытии второй вкладки, по умолчанию пользак видит ту же что и на первой
                    // Потом он переключается, и вот конкретно для него, мы убираем статус отслеживания
                    // Но этот же пользователь, может смотреть на карту и под другими конекшенами
                    // поэтому мы проверяем, смотрит ли он еще на карту...
                    if(!this._umw.isUserWatchOnMap(userId, _mapId)) {
                        prarr.push(this.updateMapWatchStatus(userId, _mapId, false));
                    }
                }
            });
            await Promise.all(prarr);

            this._umw.set(userId, connectionId, mapId, true);
            await this.updateMapWatchStatus(userId, mapId, true);
        } else if(this._umw.get(userId, connectionId, mapId)) {
            this._umw.set(userId, connectionId, mapId, false);

            if(!this._umw.isUserWatchOnMap(userId, mapId)) {
                await this.updateMapWatchStatus(userId, mapId, false);
            }
        }
    },
    async getTrackingCharactersForMapByUser (mapId, userId) {
        let groupsPr = this.getMapGroups(mapId);
        let userCharactersPr = core.userController.getUserCharacters(userId);
        let groups = await groupsPr;
        let userCharacters = await userCharactersPr;

        let cond = [];
        for (let a = 0; a < groups.length; a++) {
            for (let b = 0; b < userCharacters.length; b++) {
                cond.push([
                    {name: "characterId", operator: "=", value: userCharacters[b]},
                    {name: "groupId", operator: "=", value: groups[a]},
                    {name: "track", operator: "=", value: true},
                ]);
            }
        }

        let result = [];
        if(cond.length > 0) {
            let dbRes = await core.dbController.groupToCharacterTable.getByCondition({condition: cond, operator: "OR"}, ["characterId", "groupId", "track"]);
            result = dbRes.map(x => x.characterId);
        }

        return result;
    },
    async getMapsWhereCharacterTrackByUser (userId) {
        let characters = await core.userController.getUserCharacters(userId);
        let maps = [];

        if(characters.length > 0) {
            let condition = {
                operator: "OR",
                condition: characters.map(characterId => ({
                    operator: "AND",
                    left: {name: "characterId", operator: "=", value: characterId},
                    right: {name: "track", operator: "=", value: true}
                }))
            }

            let dbRes = await core.dbController.groupToCharacterTable.getByCondition(condition, ["groupId"]);
            let mapsArr = await Promise.all(dbRes.map(x => this.getMapsByGroup(x.groupId)));
            mapsArr.map(x => maps.merge(x));
        }

        return maps;
    },
    async updateMapWatchStatus (userId, mapId, status) {
        let characters = await this.getTrackingCharactersForMapByUser(mapId, userId);

        let map = this.get(mapId);

        if(status)
            map.addCharactersToObserve(characters);
        else
            map.removeCharactersFromObserve(characters);
    },
    async dropCharsFromMapsByUserAndConnection (userId, connectionId) {
        if(this._umw.hasUser(userId)) {
            let prarr = [];
            this._umw.eachMap(userId, connectionId, (mapId, isWatch) => {
                if(isWatch) {
                    this._umw.set(userId, connectionId, mapId, false);
                    if(!this._umw.isUserWatchOnMap(userId, mapId)) {
                        prarr.push(this.updateMapWatchStatus(userId, mapId, false));
                    }
                }
            });
            await Promise.all(prarr);
        }
    },

    async subscribeAllowedMaps (userId, connectionId, responseId) {
        let user = this._us.getUser(userId);
        let needBulk = !user.allowedMaps.notify;

        user.allowedMaps.subscribe(connectionId, responseId);

        if(needBulk) {
            let allowedMaps = await this.getMapsWhereCharacterTrackByUser(userId);
            user.allowedMaps.setData(allowedMaps);
        }

        this._us.getUser(userId).allowedMaps.subscription.notifyFor(connectionId, responseId, {
            type: "add",
            maps: user.allowedMaps.getData()
        });
    },
    async unsubscribeAllowedMaps (userId, connectionId, responseId) {
        let user = this._us.getUser(userId);
        user.allowedMaps.unsubscribe(connectionId, responseId);
        this._us.removeUser(userId);
    },

    async searchSolarSystems (match) {
        let matchLC = match.toLowerCase();

        matchLC = matchLC
            .replace(/^( *?)([a-z0-9])/igm, "$2") // remove spaces before
            .replace(/([a-z0-9])( *?)$/igm, "$1") // remove spaces after
            .replace(/\s+/img, " ")               // remove more than one spaces between symbols

        let cond = {name: "solarSystemNameLC", operator: "LIKE", value: `%${matchLC}%`};
        let result = await core.dbController.solarSystemsTable.getByCondition(cond, core.dbController.solarSystemsTable.attributes());

        let indexed = result.map(x => ({index: x.solarSystemNameLC.indexOf(matchLC), data: x}));
        let sorted = indexed.sort((a, b) => a.index - b.index);

        return sorted.map(x => ({
            systemClass: x.data.systemClass,
            security: x.data.security,
            solarSystemId: x.data.solarSystemId,
            solarSystemName: x.data.solarSystemName,
            constellationName: x.data.constellationName,
            regionName: x.data.regionName,
            systemType: x.data.systemType,
            typeName: x.data.typeName,
            isShattered: x.data.isShattered,
        }))
    }
});

module.exports = MapController;