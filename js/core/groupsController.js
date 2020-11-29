/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/21/20.
 */

const Emitter       = require("./../env/tools/emitter");
const Group         = require("./group");
const classCreator  = require("./../env/tools/class");
const exist         = require("./../env/tools/exist");
const md5           = require("md5");
const DBController  = require("./dbController");

const GroupsController = classCreator("GroupsController", Emitter, {
    constructor: function GroupsController() {
        Emitter.prototype.constructor.call(this);

        this._groups = Object.create(null);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    has: function (_groupId) {
        return !!this._groups[_groupId];
    },
    get: function (_groupId) {
        if (!this.has(_groupId)) {
            this._add(_groupId, new Group({groupId: _groupId}));
        }

        return this._groups[_groupId];
    },
    remove: function (_groupId) {
        if (this.has(_groupId)) {
            delete this._groups[_groupId];
        }
    },
    _add: function (_groupId, _mapInstance) {
        this._groups[_groupId] = _mapInstance;
    },
    connectionBreak: function (_connectionId) {
        for (let mapId in this._groups) {
            this._groups[mapId].connectionBreak(_connectionId);
        }
    },
    /**
     *
     * @param _owner - is group user id
     * @param _data
     * @param _data.characters {Array<string>}
     * @param _data.corporations {Array<string>}
     * @param _data.alliances {Array<string>}
     * @param _data.name {string}
     * @param _data.description {string}
     * @returns {Promise<any> | Promise<unknown>}
     */
    async createGroup (_owner, _data) {
        let id = md5(config.app.solt + "_" + +new Date);

        await this._updateCharacters(id, _data.characters);

        if (exist(_data.corporations))
            await this._updateCorporations(id, _data.corporations);

        if (exist(_data.alliances))
            await this._updateAlliances(id, _data.alliances);

        await core.dbController.groupsDB.add({
            id: id,
            owner: _owner,
            name: _data.name,
            description: _data.description
        });

        return id;
    },
    async removeGroup (_groupId) {
        // before remove group, we should check if map use the group by default
        // after we should remove group from map
        // we can't remove it
        // otherwise
        // after we should remove links characters to group +
        // after we should remove links corporations to group +
        // after we should remove links alliances to group -

        let maps = await this.getMapsWhereGroup(_groupId);
        if (maps.length > 0) {
            throw {
                message: `Group can not be removed: map(s) [${maps.join(", ")}] use this group`
            }
        }

        let affectedCharacters = await this.getTrackedCharactersByGroup(_groupId);
        await this._removeCharacters(_groupId);
        await this._removeCorporations(_groupId);
        await this._removeAlliances(_groupId);
        await this.removeGroupCharactersFromTracking(_groupId);
        await core.dbController.groupsDB.remove(_groupId);
        this.remove(_groupId);


        // todo NOT tested
        // Обновление состояния подписки на список доступных карт пользователей
        // В данном случае мы получим всех затронутых персонажей
        await core.mapController.notifyAllowedMapsByAffectedCharacters(affectedCharacters);
    },
    async editGroup (_groupId, _props) {
        let updCharactersPr = this._updateCharacters(_groupId, _props.characters);
        let updCorporationsPr = this._updateCorporations(_groupId, _props.corporations);
        let updAlliancesPr = this._updateAlliances(_groupId, _props.alliances);

        let characters = await updCharactersPr;
        let corporations = await updCorporationsPr;
        let alliances = await updAlliancesPr;

        // надо получить всех персонажей, которые в результате данной операции,
        // должны быть отключены от наблюдения со всех карт, к которым прикреплена данная группа
        let affectedCharactersOfflinePr = this.getAffectedCharacters(_groupId, characters.removed, corporations.removed, alliances.removed);
        let affectedCharactersOnlinePr = this.getAffectedCharacters(_groupId, characters.added, corporations.added, alliances.added);
        let affectedCharactersOffline = await affectedCharactersOfflinePr;
        let affectedCharactersOnline = await affectedCharactersOnlinePr;

        let maps = await core.mapController.getMapsByGroup(_groupId);
        await core.mapController.actualizeOfflineCharactersForMaps(maps, affectedCharactersOffline);
        await core.mapController.actualizeOnlineCharactersForMaps(maps, affectedCharactersOnline);
        await this.removeCharactersFromTracking(_groupId, affectedCharactersOffline);

        await core.dbController.groupsDB.set(_groupId, {
            name: _props.name,
            description: _props.description
        });


        // todo NOT tested
        // Обновление состояния подписки на список доступных карт пользователей
        // В данном случае мы получим всех затронутых персонажей
        let affectedCharacters = affectedCharactersOffline.slice().merge(affectedCharactersOnline);
        await core.mapController.notifyAllowedMapsByAffectedCharacters(affectedCharacters);
    },

    async getAffectedCharacters (groupId, characters, corporations, alliances) {
        characters = characters.map(x => x.toString());
        corporations = corporations.map(x => x.toString());
        alliances = alliances.map(x => x.toString());

        let trackedCharacters = await this.getTrackedCharactersByGroup(groupId);
        let charactersCorporations = await Promise.all(trackedCharacters.map(_characterId => core.charactersController.get(_characterId).getCorporationId()));
        let charactersAlliances = await Promise.all(trackedCharacters.map(_characterId => core.charactersController.get(_characterId).getAllianceId()));

        // У нас может быть ID корпорации стрингой а может быть интом, поэтому приведем к стринге
        charactersCorporations = charactersCorporations.map(_x => _x.toString());
        charactersAlliances = charactersAlliances.map(_x => _x.toString());

        // Для корпораций оставим только тех персонажей, которые удовлетворяют корпорациям и альянсам
        let charactersByCorporations = trackedCharacters.filter(function (_characterId, _index) {
            return corporations.indexOf(charactersCorporations[_index]) !== -1;
        });
        let charactersByAlliances = trackedCharacters.filter(function (_characterId, _index) {
            return alliances.indexOf(charactersAlliances[_index]) !== -1;
        });

        // Создадим массив IDов персонажей и добавим к ним персонажей из альянсов и корпораций
        let affected = characters.slice();
        affected.merge(charactersByCorporations);
        affected.merge(charactersByAlliances);

        return affected;
    },
    async _updateCharacters (_groupId, _characters) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
            {name: "first", operator: "=", value: _groupId}
        ];

        let _result = await core.dbController.linksTable.getByCondition(condition, ["second"]);

        let addedCharacterIds = [];
        let removedCharacterIds = [];
        let transactionArr = [];
        for (let a = 0; a < _characters.length; a++) {
            if (_result.searchByObjectKey("second", _characters[a]) === null) {
                transactionArr.push(core.dbController.linksTable.add({
                    type: DBController.linksTableTypes.groupToCharacter,
                    first: _groupId,
                    second: _characters[a]
                }, true));
                addedCharacterIds.push(_characters[a]);
            }
        }

        for (let b = 0; b < _result.length; b++) {
            if (_characters.indexOf(_result[b].second) === -1) {
                transactionArr.push(core.dbController.linksTable.removeByCondition([
                    {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
                    {name: "first", operator: "=", value: _groupId},
                    {name: "second", operator: "=", value: _result[b].second},
                ], true));
                removedCharacterIds.push(_result[b].second);
            }
        }

        await core.dbController.db.transaction(transactionArr);
        return {
            added: addedCharacterIds,
            removed: removedCharacterIds
        }
    },
    async _updateCorporations (_groupId, _corporations) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCorporation},
            {name: "first", operator: "=", value: _groupId}
        ];

        // HERE may be we need make transaction
        let result = await core.dbController.linksTable.getByCondition(condition, ["second"]);
        let added = [], removed = [], transactionArr = [];
        for (let a = 0; a < _corporations.length; a++) {
            if (result.searchByObjectKey("second", _corporations[a].toString()) === null) {
                transactionArr.push(core.dbController.linksTable.add({
                    type: DBController.linksTableTypes.groupToCorporation,
                    first: _groupId,
                    second: _corporations[a]
                }, true))
                added.push(_corporations[a]);
            }
        }

        for (let b = 0; b < result.length; b++) {
            if (_corporations.indexOf(parseInt(result[b].second)) === -1) {
                transactionArr.push(core.dbController.linksTable.removeByCondition([
                    {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCorporation},
                    {name: "first", operator: "=", value: _groupId},
                    {name: "second", operator: "=", value: result[b].second},
                ], true));
                removed.push(result[b].second);
            }
        }

        await core.dbController.db.transaction(transactionArr);

        return {added: added, removed: removed};
    },
    async _updateAlliances (_groupId, _alliances) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToAlliance},
            {name: "first", operator: "=", value: _groupId}
        ];

        // HERE may be we need make transaction
        let result = await core.dbController.linksTable.getByCondition(condition, ["second"]);
        let added = [], removed = [], transactionArr = [];
        for (let a = 0; a < _alliances.length; a++) {
            if (result.searchByObjectKey("second", _alliances[a].toString()) === null) {
                transactionArr.push(core.dbController.linksTable.add({
                    type: DBController.linksTableTypes.groupToAlliance,
                    first: _groupId,
                    second: _alliances[a]
                }, true))
                added.push(_alliances[a]);
            }
        }

        for (let b = 0; b < result.length; b++) {
            if (_alliances.indexOf(parseInt(result[b].second)) === -1) {
                transactionArr.push(core.dbController.linksTable.removeByCondition([
                    {name: "type", operator: "=", value: DBController.linksTableTypes.groupToAlliance},
                    {name: "first", operator: "=", value: _groupId},
                    {name: "second", operator: "=", value: result[b].second},
                ], true));
                removed.push(result[b].second);
            }
        }

        await core.dbController.db.transaction(transactionArr);

        return {added: added, removed: removed};
    },
    async getGroupListByOwner (_ownerId) {
        let ownerNamePr = core.userController.getUserName(_ownerId);
        let groupListPr = core.dbController.groupsDB.getByCondition([{name: "owner", operator: "=", value: _ownerId}], ["id", "name", "description", "owner"]);
        let groupList = await groupListPr;
        let ownerName = await ownerNamePr;

        let prarrCharacters = [], prarrCorporations = [], prarrAlliances = [];
        for (let a = 0; a < groupList.length; a++) {
            prarrCharacters.push(this.getGroupCharacters(groupList[a].id));
            prarrCorporations.push(this.getGroupCorporations(groupList[a].id));
            prarrAlliances.push(this.getGroupAlliances(groupList[a].id));
        }

        let characterIds = await Promise.all(prarrCharacters);
        let corporationIds = await Promise.all(prarrCorporations);
        let allianceIds = await Promise.all(prarrAlliances);

        for (let a = 0; a < groupList.length; a++) {
            groupList[a].characters = characterIds[a];
            groupList[a].corporations = corporationIds[a];
            groupList[a].alliances = allianceIds[a];
            groupList[a].owner = ownerName;
        }
        return groupList;
    },
    // TODO need remove it?
    // existsCharacterInGroup: function (_groupId, _characterId) {
    //     let pr = new CustomPromise();
    //
    //     let condition = [
    //         {name: "type",operator: "=",value: DBController.linksTableTypes.groupToCharacter},
    //         {name: "first",operator: "=",value: _groupId},
    //         {name: "second",operator: "=",value: _characterId}
    //     ];
    //
    //     core.dbController.linksTable.existsByCondition(condition).then(function (_exists) {
    //         pr.resolve(_exists);
    //     }.bind(this), function (_err) {
    //         pr.reject(_err);
    //     }.bind(this));
    //
    //     return pr.native;
    // },
     async getGroupCharacters (_groupId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
            {name: "first", operator: "=", value: _groupId}
        ];

        let result = await core.dbController.linksTable.getByCondition(condition, ["second"]);
        return result.map(x => x.second);
    },
    async getGroupCorporations (_groupId) {
        let condition = [
            {name: "type",operator: "=",value: DBController.linksTableTypes.groupToCorporation},
            {name: "first",operator: "=",value: _groupId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["second"]);
        return result.map(x => x.second * 1)
    },
    async getGroupAlliances (_groupId) {
        let condition = [
            {name: "type",operator: "=",value: DBController.linksTableTypes.groupToAlliance},
            {name: "first",operator: "=",value: _groupId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["second"]);
        return result.map(x => x.second * 1);
    },
    async getAllowedGroupListByOwner (_ownerId) {
        let groups = [];
        let characters = await core.userController.getUserCharacters(_ownerId);
        let allowedGroups = await Promise.all(characters.map(_characterId => this.getAllowedGroupsByCharacter(_characterId)));
        allowedGroups.map(_arr => groups.merge(_arr));

        let groupsInfo = await Promise.all(groups.map(_groupId => this.get(_groupId).getInfo()));

        let prarr = [];
        for (let a = 0; a < groupsInfo.length; a++) {
            groupsInfo[a].id = groups[a];
            prarr.push(core.userController.getUserName(groupsInfo[a].owner));
        }

        return groupsInfo;
    },

    // Allow get groups by
    // corporations
    // characters
    async getAllowedGroupsByCharacter (_characterId) {
        let corporationId = await core.charactersController.get(_characterId).getCorporationId();
        let allianceId = await core.charactersController.get(_characterId).getAllianceId();
        let groupsByAlliancePr = this.getGroupsByAlliance(allianceId);
        let groupsByCorporationPr = this.getGroupsByCorporation(corporationId);
        let groupsByCharacterPr = this.getGroupsByCharacter(_characterId);

        let groupsByAlliance = await groupsByAlliancePr;
        let groupsByCorporation = await groupsByCorporationPr;
        let groupsByCharacter = await groupsByCharacterPr;

        return groupsByCorporation.slice()
            .merge(groupsByCharacter)
            .merge(groupsByAlliance);
    },
    async getGroupsByCharacter (_characterId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
            {name: "second", operator: "=", value: _characterId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.map(_x => _x.first);
    },
    async getGroupsByCorporation (_corporationId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCorporation},
            {name: "second", operator: "=", value: _corporationId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.map(_x => _x.first);
    },
    async getGroupsByAlliance (_allianceId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToAlliance},
            {name: "second", operator: "=", value: _allianceId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.map(_x => _x.first);
    },
    // /**
    //  * TODO ?deprecated
    //  * Этот метод должен вернуть список карт, которые доступны для пользователя
    //  *
    //  * по идее - надо пройтись по всем картам, которые есть
    //  * потом испросить для каждой карты группы
    //  * потом профильтровать для каждой группы персонажей пользователя
    //  * звучит как-то накладно
    //  *
    //  * ИЛИ быть умнее
    //  * найти все доступные для пользователя группы, и вернуть карты, которые для них соответствуют (Гениально!)
    //  * @param _userId
    //  */
    // getAllowedMapsByUser: async function (_userId) {
    //     let pr = new CustomPromise();
    //
    //     try {
    //         let groups = await this.getAllowedGroupListByOwner(_userId);
    //
    //         /**
    //          * output of this operations is
    //          * @type {Array<Array<Number>>}
    //          */
    //         let mapsArr = await Promise.all(groups.map(_group => core.mapController.getMapsByGroup(_group.id)))
    //
    //         let maps = [];
    //         mapsArr.map(_maps => maps.merge(_maps));
    //
    //         let filteredMaps = maps.filter(_map => _map !== null);
    //
    //         let outMaps = [];
    //         let filterObj = Object.create(null);
    //
    //         for (let a = 0; a < filteredMaps.length; a++) {
    //             let mapId = filteredMaps[a];
    //
    //             if(!filterObj[mapId]) {
    //                 filterObj[mapId] = true;
    //                 outMaps.push(mapId);
    //             }
    //         }
    //
    //         pr.resolve(outMaps);
    //     } catch (_err) {
    //         debugger;
    //         pr.reject(_err);
    //     }
    //
    //     return pr.native;
    // },
    /**
     * Этот метод вернет всех персонажей, которые удовлетворяют условиям группы и принадлежат переданному пользователю
     * - добавлены в список перснонажей
     * - находятся в корпорации, которая добавлена в список корпораций
     * - находятся в альянсе, который добавлен в список альянсов
     *
     * @param {string} _userId
     * @param {string} _groupId
     * @returns {Promise<Array<string>>}
     */
    async getAllowedCharactersForGroupByUser (_groupId, _userId) {
        let userCharacters = await core.userController.getUserCharacters(_userId);
        return await this.getAllowedCharactersForGroup(_groupId, userCharacters);
    },

    // /**
    //  * Этот метод вернет всех персонажей, которые удовлетворяют условиям группы т.е.:
    //  * - при этом, пользователь должен быть онлайн
    //  * - добавлены в список перснонажей
    //  * - находятся в корпорации, которая добавлена в список корпораций
    //  * - находятся в альянсе, который добавлен в список альянсов
    //  *
    //  * @param {string} _groupId
    //  * @returns {Promise<Array<string>>}
    //  */
    // getAllAllowedCharactersForGroupByOnlineUser: async function (_groupId) {
    //     let pr = new CustomPromise();
    //
    //     // todo - почему-то пользователей на онлайн я не проверяю
    //     let userCharacters = await core.charactersController.getAllCharactersByOnlineUser();
    //
    //     try {
    //         let out = await this.getAllowedCharactersForGroup(_groupId, userCharacters);
    //         pr.resolve(out);
    //     } catch (_err) {
    //         pr.resolve(_err);
    //     }
    //
    //     return pr.native;
    // },

    /**
     * Этот метод профильтрует всех персонажей, которые туда будут переданы
     * Предполагается, что эти персонажи прикреплены к пользователю.
     * Соответственно здесь, будет проведена выборка из пресонажей, корпораций и альянсов, которые присоеденины к группе
     * @param _groupId
     * @param _charactersIds
     * @returns {Promise<Array<string>>}
     * @private
     */
    async getAllowedCharactersForGroup (_groupId, _charactersIds) {
        let groupCharactersPr = this.getGroupCharacters(_groupId);
        let groupCharactersByCorporationsPr = this.getAllowedCharactersForGroupByCorporations(_groupId, _charactersIds);
        let groupCharactersByAlliancesPr = this.getAllowedCharactersForGroupByAlliances(_groupId, _charactersIds);

        let groupCharacters = await groupCharactersPr;
        let groupCharactersByCorporations = await groupCharactersByCorporationsPr;
        let groupCharactersByAlliances = await groupCharactersByAlliancesPr;

        let crossCharactersByCharacters = Array.cross(_charactersIds, groupCharacters);
        let crossCharactersByCorporations = Array.cross(_charactersIds, groupCharactersByCorporations);
        let crossCharactersByAlliances = Array.cross(_charactersIds, groupCharactersByAlliances);

        let characterIds = crossCharactersByCharacters
            .merge(crossCharactersByCorporations)
            .merge(crossCharactersByAlliances);

        let prarrTracks = [];
        let prarrCharacterNames = [];
        for (let a = 0; a < characterIds.length; a++) {
            prarrTracks.push(this.getCharacterTrack(_groupId, characterIds[a]));
            prarrCharacterNames.push(core.charactersController.get(characterIds[a]).getName());
        }

        let trackArr = await Promise.all(prarrTracks);
        let namesArr = await Promise.all(prarrCharacterNames);
        return characterIds.map((id, index) => ({id: characterIds[index], track: trackArr[index], name: namesArr[index]}));
    },
    // getAllowedCharactersForGroups: async function (_groups) {
    //     let pr = new CustomPromise();
    //
    //     try {
    //         // we need take all allowed characters in this game
    //         let characterIds = await core.charactersController.getAllCharacters();
    //         let arrCharacters = await Promise.all(_groups.map(_groupId => this.getAllowedCharactersForGroup(_groupId, characterIds)));
    //         let filteredCharactersObj = Object.create(null);
    //         let outCharacterIds = [];
    //         //todo необходимо убрать все пересечения
    //         for (let a = 0; a < arrCharacters.length; a++) {
    //             let characters = arrCharacters[a];
    //
    //             for (let b = 0; b < characters.length; b++) {
    //                 let charInfo = characters[b];
    //                 if(!filteredCharactersObj[charInfo.id]) {
    //                     filteredCharactersObj[charInfo.id] = true;
    //                     outCharacterIds.push(charInfo);
    //                 }
    //             }
    //
    //         }
    //
    //         pr.resolve(outCharacterIds);
    //     } catch (_err) {
    //         pr.reject();
    //     }
    //
    //     return pr.native;
    // },
    // getAllGroups: async function () {
    //     let pr = new CustomPromise();
    //
    //     try {
    //         let groups = await core.groupsDB.all();
    //
    //         pr.resolve(groups.map(_group => _group.id));
    //     } catch (_err) {
    //         pr.reject(_err);
    //     }
    //
    //     return pr.native;
    // },

    async getAllowedCharactersForGroupByCorporations (_groupId, _characterIds) {
        let corporationIdsPr = Promise.all(_characterIds.map(_characterId => core.charactersController.get(_characterId).getCorporationId()));
        let groupCorporationsPr = this.getGroupCorporations(_groupId);

        let corporationIds = await corporationIdsPr;
        let groupCorporations = await groupCorporationsPr;

        let gcMap = groupCorporations.convertToMap();

        let out = [];
        corporationIds.map((x, i) => x !== -1 && gcMap[x] && out.push(_characterIds[i]));
        return out;
    },
    async getAllowedCharactersForGroupByAlliances (_groupId, _characterIds) {
        let allianceIdsPr = Promise.all(_characterIds.map(_characterId => core.charactersController.get(_characterId).getAllianceId()));
        let groupAlliancesPr = this.getGroupAlliances(_groupId);

        let allianceIds = await allianceIdsPr;
        let groupAlliances = await groupAlliancesPr;

        let gaMap = groupAlliances.convertToMap();

        let out = [];
        allianceIds.map((x, i) => x !== -1 && gaMap[x] && out.push(_characterIds[i]));
        return out;
    },
    async updateAllowedCharactersForGroup (_userId, _groupId, _characters) {
        await Promise.all(_characters.map(_character => this.updateCharacterTrack(_groupId, _character.id, _character.track)));
        await core.mapController.notifyAllowedMapsByUser(_userId);
    },
    async getMapsWhereGroup (_groupId) {
        var cond = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.mapToGroups},
            {name: "second", operator: "=", value: _groupId}
        ];

        let result = await core.dbController.linksTable.getByCondition(cond, ["first", "second"]);
        let maps = await Promise.all(result.map(_data => core.dbController.mapsDB.get(_data.first, "name")));
        return maps;
    },
    async getCharacterTrack (_groupId, _characterId) {
        let condition = [
            {name: "groupId",operator: "=",value: _groupId},
            {name: "characterId",operator: "=",value: _characterId}
        ];
        let result = await core.dbController.groupToCharacterTable.getByCondition(condition, ["track"]);
        return result.length === 1 ? result[0].track : false;
    },
    // removeCharacterFromTracking: async function (_groupId, _characterId) {
    //     let pr = new CustomPromise();
    //
    //     try {
    //         let gtCondition = [{name: "characterId", operator: "=", value: _characterId}];
    //         await core.dbController.groupToCharacterTable.removeByCondition(gtCondition);
    //         pr.resolve();
    //     } catch (_err) {
    //         pr.reject(_err);
    //     }
    //
    //     return pr.native;
    // },
    async removeCharactersFromTracking (_groupId, _characterIds) {
        if(_characterIds.length > 0) {
            await core.dbController.groupToCharacterTable.removeByCondition({
                left: {name: "groupId", operator: "=", value: _groupId},
                operator: "AND",
                right: {
                    operator: "OR",
                    condition: _characterIds.map(x => ({name: "characterId", operator: "=", value: x}))
                }
            });
        }
    },
    async removeGroupCharactersFromTracking (_groupId) {
        await core.dbController.groupToCharacterTable.removeByCondition([{name: "groupId", operator: "=", value: _groupId}]);
    },
    async getTrackedCharactersByGroup (_groupId) {
        let condition = [{name: "groupId", operator: "=", value: _groupId}];
        let result = await core.dbController.groupToCharacterTable.getByCondition(condition, ["characterId"]);
        return result.map(_data => _data.characterId);
    },
    // async getTrackedCharactersByGroups (groups) {
    //     let condition = {
    //         operator: "OR",
    //         cond: groups.map(groupId => ({name: "groupId", operator: "=", value: groupId}))
    //     };
    //
    //     let result = await core.dbController.groupToCharacterTable.getByCondition(condition, ["characterId"]);
    //     return result.map(x => x.characterId);
    // },
    async getGroupsByTrackedCharacterId (_characterId) {
        let condition = [
            {name: "characterId",operator: "=",value: _characterId},
            {name: "track",operator: "=",value: true},
        ];
        let groups = await core.dbController.groupToCharacterTable.getByCondition(condition, ["groupId"]);
        return groups.map(x => x.groupId);
    },
    async updateCharacterTrack (_groupId, _characterId, _track) {
        let condition = [
            {name: "groupId", operator: "=", value: _groupId},
            {name: "characterId", operator: "=", value: _characterId}
        ];

        let result = await core.dbController.groupToCharacterTable.getByCondition(condition, ["track"]);
        let isExist = result.length > 0;
        if (isExist && result[0].track !== _track) {
            let maps = await core.mapController.getMapsByGroup(_groupId);
            await core.dbController.groupToCharacterTable.setByCondition(condition, {track: _track});
            await core.mapController.updateCharacterTrackStatus(maps, _characterId, _track);
        } else if(!isExist && _track) {
            let maps = await core.mapController.getMapsByGroup(_groupId);
            await core.dbController.groupToCharacterTable.add({
                groupId: _groupId,
                characterId: _characterId,
                track: _track
            });
            await core.mapController.updateCharacterTrackStatus(maps, _characterId, true);
        }
    },
    async _removeCharacters (groupId) {
        await core.dbController.linksTable.removeByCondition([
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
            {name: "first", operator: "=", value: groupId}
        ]);
    },
    async _removeCorporations (groupId) {
        await core.dbController.linksTable.removeByCondition([
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCorporation},
            {name: "first", operator: "=", value: groupId}
        ]);
    },
    async _removeAlliances (groupId) {
        await core.dbController.linksTable.removeByCondition([
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToAlliance},
            {name: "first", operator: "=", value: groupId}
        ]);
    },
});


module.exports = GroupsController;