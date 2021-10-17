/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/21/20.
 */

const Emitter = require("./../env/_new/tools/emitter");
const Group = require("./group");
const exist = require("./../env/tools/exist");
const md5 = require("md5");
const DBController = require("./dbController");
const {getName: getCharacterName, getAllianceId, getCorporationId} = require('./characters/utils');

class GroupsController extends Emitter {
    constructor() {
        super();

        this._groups = Object.create(null);
    }

    has(_groupId) {
        return !!this._groups[_groupId];
    }

    /**
     *
     * @param _groupId
     * @returns {Group}
     */
    get(_groupId) {
        if (!this.has(_groupId)) {
            this._add(_groupId, new Group({groupId: _groupId}));
        }

        return this._groups[_groupId];
    }

    remove(_groupId) {
        if (this.has(_groupId)) {
            delete this._groups[_groupId];
        }
    }

    _add(_groupId, _mapInstance) {
        this._groups[_groupId] = _mapInstance;
    }

    connectionBreak(_connectionId) {
        for (let mapId in this._groups) {
            this._groups[mapId].connectionBreak(_connectionId);
        }
    }

    /**
     *
     * @param owner - is group user id
     * @param _data
     * @param _data.characters {Array<string>}
     * @param _data.corporations {Array<string>}
     * @param _data.alliances {Array<string>}
     * @param _data.moderators {Array<string>}
     * @param _data.name {string}
     * @param _data.description {string}
     * @returns {Promise<any> | Promise<unknown>}
     */
    async createGroup(owner, {name, description, characters, corporations, alliances, moderators}) {
        let id = md5(config.app.solt + "_" + +new Date);

        await this._abstractUpdateGroupList(DBController.linksTableTypes.groupToCharacter, id, characters);

        if (exist(corporations))
            await this._abstractUpdateGroupList(DBController.linksTableTypes.groupToCorporation, id, corporations);

        if (exist(alliances))
            await this._abstractUpdateGroupList(DBController.linksTableTypes.groupToAlliance, id, alliances);

        // if (exist(moderators))
        //     await this._abstractUpdateGroupList(DBController.linksTableTypes.groupToModerator, id, moderators);

        await core.dbController.groupsDB.add({id, owner, name, description});

        return id;
    }

    async removeGroup(_groupId) {
        // before remove group, we should check if map use the group by default
        // after we should remove group from map
        // we can't remove it
        // otherwise
        // after we should remove links characters to group +
        // after we should remove links corporations to group +
        // after we should remove links alliances to group -

        let mapsIds = await this.getMapsByGroup(_groupId);
        let maps = await Promise.all(mapsIds.map(mapId => core.dbController.mapsDB.get(mapId, "name")));

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
    }

    async editGroup(_groupId, _props) {
        let updCharactersPr = this._abstractUpdateGroupList(DBController.linksTableTypes.groupToCharacter, _groupId, _props.characters);
        let updCorporationsPr = this._abstractUpdateGroupList(DBController.linksTableTypes.groupToCorporation, _groupId, _props.corporations);
        let updAlliancesPr = this._abstractUpdateGroupList(DBController.linksTableTypes.groupToAlliance, _groupId, _props.alliances);
        // let updModeratorsPr = this._abstractUpdateGroupList(DBController.linksTableTypes.groupToAlliance, _groupId, _props.moderators);

        let characters = await updCharactersPr;
        let corporations = await updCorporationsPr;
        let alliances = await updAlliancesPr;
        // let moderators = await updModeratorsPr;

        // надо получить всех персонажей, которые в результате данной операции,
        // должны быть отключены от наблюдения со всех карт, к которым прикреплена данная группа

        let affectedCharactersOfflinePr = this.getAffectedCharacters(_groupId, characters.removedIds, corporations.removedIds, alliances.removedIds);
        let affectedCharactersOnlinePr = this.getAffectedCharacters(_groupId, characters.addedIds, corporations.addedIds, alliances.addedIds);
        let affectedCharactersOffline = await affectedCharactersOfflinePr;
        let affectedCharactersOnline = await affectedCharactersOnlinePr;

        let maps = await core.groupsController.getMapsByGroup(_groupId);
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
    }

    async getAffectedCharacters(groupId, characters, corporations, alliances) {
        characters = characters.map(x => x.toString());
        corporations = corporations.map(x => x.toString());
        alliances = alliances.map(x => x.toString());

        let trackedCharacters = await this.getTrackedCharactersByGroup(groupId);
        let charactersCorporations = await Promise.all(trackedCharacters.map(charId => getCorporationId(charId)));
        let charactersAlliances = await Promise.all(trackedCharacters.map(charId => getAllianceId(charId)));

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
    }


    async _abstractUpdateGroupList(type, groupId, arr) {
        let condition = [
            {name: "type", operator: "=", value: type},
            {name: "first", operator: "=", value: groupId}
        ];

        let _result = await core.dbController.linksTable.getByCondition(condition, ["second"]);

        let addedIds = [];
        let removedIds = [];
        let transactionArr = [];
        for (let a = 0; a < arr.length; a++) {
            if (_result.searchByObjectKey("second", arr[a]) === null) {
                transactionArr.push(core.dbController.linksTable.add({
                    type: type,
                    first: groupId,
                    second: arr[a]
                }, true));
                addedIds.push(arr[a]);
            }
        }

        for (let b = 0; b < _result.length; b++) {
            if (arr.indexOf(_result[b].second) === -1) {
                transactionArr.push(core.dbController.linksTable.removeByCondition([
                    {name: "type", operator: "=", value: type},
                    {name: "first", operator: "=", value: groupId},
                    {name: "second", operator: "=", value: _result[b].second},
                ], true));
                removedIds.push(_result[b].second);
            }
        }

        await core.dbController.db.transaction(transactionArr);
        return {addedIds, removedIds}
    }

    // async getGroupListByOwner (_ownerId) {
    //     let groupList = await core.dbController.groupsDB.getByCondition([{name: "owner", operator: "=", value: _ownerId}], ["id", "name", "description", "owner"]);
    //
    //     let prarrCharacters = [], prarrCorporations = [], prarrAlliances = [];
    //     for (let a = 0; a < groupList.length; a++) {
    //         prarrCharacters.push(this.getGroupCharacters(groupList[a].id));
    //         prarrCorporations.push(this.getGroupCorporations(groupList[a].id));
    //         prarrAlliances.push(this.getGroupAlliances(groupList[a].id));
    //     }
    //
    //     let characterIds = await Promise.all(prarrCharacters);
    //     let corporationIds = await Promise.all(prarrCorporations);
    //     let allianceIds = await Promise.all(prarrAlliances);
    //
    //     for (let a = 0; a < groupList.length; a++) {
    //         groupList[a].characters = characterIds[a];
    //         groupList[a].corporations = corporationIds[a];
    //         groupList[a].alliances = allianceIds[a];
    //         groupList[a].owner = _ownerId;
    //     }
    //     return groupList;
    // },
    /**
     *
     * @param ownerId
     * @return {Promise<{name: String, id: String, description: String}>}
     */
    async getGroupsByOwner(ownerId) {
        return await core.dbController.groupsDB.getByCondition([{
            name: "owner",
            operator: "=",
            value: ownerId
        }], ["id", "name", "description"]);
    }

    async getProtectedInfo(groupId) {
        let charPr = this.getGroupCharacters(groupId);
        let corpPr = this.getGroupCorporations(groupId);
        let allyPr = this.getGroupAlliances(groupId);

        let characters = await charPr;
        let corporations = await corpPr;
        let alliances = await allyPr;

        return {characters, corporations, alliances};
    }

    async getGroupCharacters(_groupId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
            {name: "first", operator: "=", value: _groupId}
        ];

        let result = await core.dbController.linksTable.getByCondition(condition, ["second"]);
        return result.map(x => x.second);
    }

    async getGroupCorporations(_groupId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCorporation},
            {name: "first", operator: "=", value: _groupId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["second"]);
        return result.map(x => x.second * 1)
    }

    async getGroupAlliances(_groupId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToAlliance},
            {name: "first", operator: "=", value: _groupId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["second"]);
        return result.map(x => x.second * 1);
    }

    async getAllowedGroupListByOwner(_ownerId) {
        let groups = [];
        let characters = await core.userController.getUserCharacters(_ownerId);
        let allowedGroups = await Promise.all(characters.map(_characterId => this.getAllowedGroupsByCharacter(_characterId)));
        allowedGroups.map(_arr => groups.merge(_arr));

        let groupsInfo = await Promise.all(groups.map(_groupId => this.get(_groupId).getInfo()));
        return groupsInfo;
    }

    // Allow get groups by
    // corporations
    // characters
    async getAllowedGroupsByCharacter(_characterId) {
        let corporationId = await getCorporationId(_characterId);
        let allianceId = await getAllianceId(_characterId);
        let groupsByAlliancePr = this.getGroupsByAlliance(allianceId);
        let groupsByCorporationPr = this.getGroupsByCorporation(corporationId);
        let groupsByCharacterPr = this.getGroupsByCharacter(_characterId);

        let groupsByAlliance = await groupsByAlliancePr;
        let groupsByCorporation = await groupsByCorporationPr;
        let groupsByCharacter = await groupsByCharacterPr;

        return groupsByCorporation.slice()
            .merge(groupsByCharacter)
            .merge(groupsByAlliance);
    }

    async getGroupsByCharacter(_characterId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
            {name: "second", operator: "=", value: _characterId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.map(_x => _x.first);
    }

    async getGroupsByCorporation(_corporationId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCorporation},
            {name: "second", operator: "=", value: _corporationId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.map(_x => _x.first);
    }

    async getGroupsByAlliance(_allianceId) {
        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToAlliance},
            {name: "second", operator: "=", value: _allianceId}
        ];
        let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
        return result.map(_x => _x.first);
    }

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
    async getAllowedCharactersForGroupByUser(_groupId, _userId) {
        let userCharacters = await core.userController.getUserCharacters(_userId);
        return await this.getAllowedCharactersForGroup(_groupId, userCharacters);
    }

    /**
     * Этот метод профильтрует всех персонажей, которые туда будут переданы
     * Предполагается, что эти персонажи прикреплены к пользователю.
     * Соответственно здесь, будет проведена выборка из пресонажей, корпораций и альянсов, которые присоеденины к группе
     * @param _groupId
     * @param _charactersIds
     * @returns {Promise<Array<string>>}
     * @private
     */
    async getAllowedCharactersForGroup(_groupId, _charactersIds) {
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
            prarrCharacterNames.push(getCharacterName(characterIds[a]));
        }

        let trackArr = await Promise.all(prarrTracks);
        let namesArr = await Promise.all(prarrCharacterNames);
        return characterIds.map((id, index) => ({
            id: characterIds[index],
            track: trackArr[index],
            name: namesArr[index]
        }));
    }

    async getAllowedCharactersForGroupByCorporations(_groupId, _characterIds) {
        let corporationIdsPr = Promise.all(_characterIds.map(charId => getCorporationId(charId)));
        let groupCorporationsPr = this.getGroupCorporations(_groupId);

        let corporationIds = await corporationIdsPr;
        let groupCorporations = await groupCorporationsPr;

        let gcMap = groupCorporations.convertToMap();

        let out = [];
        corporationIds.map((x, i) => x !== -1 && gcMap[x] && out.push(_characterIds[i]));
        return out;
    }

    async getAllowedCharactersForGroupByAlliances(_groupId, _characterIds) {
        let allianceIdsPr = Promise.all(_characterIds.map(charId => getAllianceId(charId)));
        let groupAlliancesPr = this.getGroupAlliances(_groupId);

        let allianceIds = await allianceIdsPr;
        let groupAlliances = await groupAlliancesPr;

        let gaMap = groupAlliances.convertToMap();

        let out = [];
        allianceIds.map((x, i) => x !== -1 && gaMap[x] && out.push(_characterIds[i]));
        return out;
    }

    async updateAllowedCharactersForGroup(_userId, _groupId, _characters) {
        await Promise.all(_characters.map(_character => this.updateCharacterTrack(_groupId, _character.id, _character.track)));
        await core.mapController.notifyAllowedMapsByUser(_userId);
    }

    /**
     *
     * @param _groupId
     * @return {Promise<number[]>}
     */
    async getMapsByGroup(_groupId) {
        var cond = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.mapToGroups},
            {name: "second", operator: "=", value: _groupId}
        ];
        let result = await core.dbController.linksTable.getByCondition(cond, ["first"]);
        return result.map(x => x.first);
    }

    async getCharacterTrack(_groupId, _characterId) {
        let condition = [
            {name: "groupId", operator: "=", value: _groupId},
            {name: "characterId", operator: "=", value: _characterId}
        ];
        let result = await core.dbController.groupToCharacterTable.getByCondition(condition, ["track"]);
        return result.length === 1 ? result[0].track : false;
    }

    async removeCharactersFromTracking(_groupId, _characterIds) {
        if (_characterIds.length > 0) {
            await core.dbController.groupToCharacterTable.removeByCondition({
                left: {name: "groupId", operator: "=", value: _groupId},
                operator: "AND",
                right: {
                    operator: "OR",
                    condition: _characterIds.map(x => ({name: "characterId", operator: "=", value: x}))
                }
            });
        }
    }

    async removeGroupCharactersFromTracking(_groupId) {
        await core.dbController.groupToCharacterTable.removeByCondition([{
            name: "groupId",
            operator: "=",
            value: _groupId
        }]);
    }

    async getTrackedCharactersByGroup(_groupId) {
        let condition = [{name: "groupId", operator: "=", value: _groupId}];
        let result = await core.dbController.groupToCharacterTable.getByCondition(condition, ["characterId"]);
        return result.map(_data => _data.characterId);
    }

    /**
     *
     * @param {string} _characterId
     * @return {Promise<string[]>}
     */
    async getGroupsByTrackedCharacterId(_characterId) {
        let condition = [
            {name: "characterId", operator: "=", value: _characterId},
            {name: "track", operator: "=", value: true},
        ];
        let groups = await core.dbController.groupToCharacterTable.getByCondition(condition, ["groupId"]);
        return groups.map(x => x.groupId);
    }

    async updateCharacterTrack(_groupId, _characterId, _track) {
        let condition = [
            {name: "groupId", operator: "=", value: _groupId},
            {name: "characterId", operator: "=", value: _characterId}
        ];

        let result = await core.dbController.groupToCharacterTable.getByCondition(condition, ["track"]);
        let isExist = result.length > 0;
        if (isExist && result[0].track !== _track) {
            let maps = await core.groupsController.getMapsByGroup(_groupId);
            await core.dbController.groupToCharacterTable.setByCondition(condition, {track: _track});
            await core.mapController.updateCharacterTrackStatus(maps, _characterId, _track);
        } else if (!isExist && _track) {
            let maps = await core.groupsController.getMapsByGroup(_groupId);
            await core.dbController.groupToCharacterTable.add({
                groupId: _groupId,
                characterId: _characterId,
                track: _track
            });
            await core.mapController.updateCharacterTrackStatus(maps, _characterId, true);
        }
    }

    async _removeCharacters(groupId) {
        await core.dbController.linksTable.removeByCondition([
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
            {name: "first", operator: "=", value: groupId}
        ]);
    }

    async _removeCorporations(groupId) {
        await core.dbController.linksTable.removeByCondition([
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCorporation},
            {name: "first", operator: "=", value: groupId}
        ]);
    }

    async _removeAlliances(groupId) {
        await core.dbController.linksTable.removeByCondition([
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToAlliance},
            {name: "first", operator: "=", value: groupId}
        ]);
    }
}

module.exports = GroupsController;