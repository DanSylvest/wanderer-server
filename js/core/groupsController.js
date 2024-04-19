/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/21/20.
 */

const md5 = require("md5");
const Emitter = require("../env/_new/tools/emitter");
const Group = require("./group");
const exist = require("../env/tools/exist");
const DBController = require("./dbController");
const {
  getName: getCharacterName,
  getAllianceId,
  getCorporationId,
} = require("./characters/utils");

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
      this._add(_groupId, new Group({ groupId: _groupId }));
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
    for (const mapId in this._groups) {
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
  async createGroup(
    owner,
    { name, description, characters, corporations, alliances, moderators },
  ) {
    const id = md5(`${config.app.solt}_${+new Date()}`);

    await this._abstractUpdateGroupList(
      DBController.linksTableTypes.groupToCharacter,
      id,
      characters,
    );

    if (exist(corporations))
      await this._abstractUpdateGroupList(
        DBController.linksTableTypes.groupToCorporation,
        id,
        corporations,
      );

    if (exist(alliances))
      await this._abstractUpdateGroupList(
        DBController.linksTableTypes.groupToAlliance,
        id,
        alliances,
      );

    if (exist(moderators))
      await this._abstractUpdateGroupList(
        DBController.linksTableTypes.groupToModerator,
        id,
        moderators,
      );

    await core.dbController.groupsDB.add({
      id,
      owner,
      name,
      description,
    });

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

    const mapsIds = await this.getMapsByGroup(_groupId);
    const maps = await Promise.all(
      mapsIds.map((mapId) => core.dbController.mapsDB.get(mapId, "name")),
    );

    if (maps.length > 0) {
      throw {
        message: `Group can not be removed: map(s) [${maps.join(", ")}] use this group`,
      };
    }

    const affectedCharacters = await this.getTrackedCharactersByGroup(_groupId);
    await this._removeCharacters(_groupId);
    await this._removeCorporations(_groupId);
    await this._removeAlliances(_groupId);
    await this.removeGroupCharactersFromTracking(_groupId);
    await core.dbController.groupsDB.remove(_groupId);
    this.remove(_groupId);

    // todo NOT tested
    // Обновление состояния подписки на список доступных карт пользователей
    // В данном случае мы получим всех затронутых персонажей
    await core.mapController.notifyAllowedMapsByAffectedCharacters(
      affectedCharacters,
    );
  }

  async editGroup(_groupId, _props) {
    const updCharactersPr = this._abstractUpdateGroupList(
      DBController.linksTableTypes.groupToCharacter,
      _groupId,
      _props.characters,
    );
    const updCorporationsPr = this._abstractUpdateGroupList(
      DBController.linksTableTypes.groupToCorporation,
      _groupId,
      _props.corporations,
    );
    const updAlliancesPr = this._abstractUpdateGroupList(
      DBController.linksTableTypes.groupToAlliance,
      _groupId,
      _props.alliances,
    );
    const updModeratorsPr = this._abstractUpdateGroupList(
      DBController.linksTableTypes.groupToModerator,
      _groupId,
      _props.moderators,
    );

    const characters = await updCharactersPr;
    const corporations = await updCorporationsPr;
    const alliances = await updAlliancesPr;
    await updModeratorsPr;

    // надо получить всех персонажей, которые в результате данной операции,
    // должны быть отключены от наблюдения со всех карт, к которым прикреплена данная группа

    const affectedCharactersOfflinePr = this.getAffectedCharacters(
      _groupId,
      characters.removedIds,
      corporations.removedIds,
      alliances.removedIds,
    );
    const affectedCharactersOnlinePr = this.getAffectedCharacters(
      _groupId,
      characters.addedIds,
      corporations.addedIds,
      alliances.addedIds,
    );
    const affectedCharactersOffline = await affectedCharactersOfflinePr;
    const affectedCharactersOnline = await affectedCharactersOnlinePr;

    const maps = await core.groupsController.getMapsByGroup(_groupId);
    await core.mapController.actualizeOfflineCharactersForMaps(
      maps,
      affectedCharactersOffline,
    );
    await core.mapController.actualizeOnlineCharactersForMaps(
      maps,
      affectedCharactersOnline,
    );
    await this.removeCharactersFromTracking(
      _groupId,
      affectedCharactersOffline,
    );

    await core.dbController.groupsDB.set(_groupId, {
      name: _props.name,
      description: _props.description,
    });

    // todo NOT tested
    // Обновление состояния подписки на список доступных карт пользователей
    // В данном случае мы получим всех затронутых персонажей
    const affectedCharacters = affectedCharactersOffline
      .slice()
      .merge(affectedCharactersOnline);
    await core.mapController.notifyAllowedMapsByAffectedCharacters(
      affectedCharacters,
    );
  }

  async getAffectedCharacters(groupId, characters, corporations, alliances) {
    characters = characters.map((x) => x.toString());
    corporations = corporations.map((x) => x.toString());
    alliances = alliances.map((x) => x.toString());

    const trackedCharacters = await this.getTrackedCharactersByGroup(groupId);
    let charactersCorporations = await Promise.all(
      trackedCharacters.map((charId) => getCorporationId(charId)),
    );
    let charactersAlliances = await Promise.all(
      trackedCharacters.map((charId) => getAllianceId(charId)),
    );

    // У нас может быть ID корпорации стрингой а может быть интом, поэтому приведем к стринге
    charactersCorporations = charactersCorporations.map((_x) => _x.toString());
    charactersAlliances = charactersAlliances.map((_x) => _x.toString());

    // Для корпораций оставим только тех персонажей, которые удовлетворяют корпорациям и альянсам
    const charactersByCorporations = trackedCharacters.filter(
      (_characterId, _index) =>
        corporations.indexOf(charactersCorporations[_index]) !== -1,
    );
    const charactersByAlliances = trackedCharacters.filter(
      (_characterId, _index) =>
        alliances.indexOf(charactersAlliances[_index]) !== -1,
    );

    // Создадим массив IDов персонажей и добавим к ним персонажей из альянсов и корпораций
    const affected = characters.slice();
    affected.merge(charactersByCorporations);
    affected.merge(charactersByAlliances);

    return affected;
  }

  async _abstractUpdateGroupList(type, groupId, arr) {
    const condition = [
      { name: "type", operator: "=", value: type },
      { name: "first", operator: "=", value: groupId },
    ];

    const _result = await core.dbController.linksTable.getByCondition(
      condition,
      ["second"],
    );

    const addedIds = [];
    const removedIds = [];
    const transactionArr = [];
    for (let a = 0; a < arr.length; a++) {
      if (_result.searchByObjectKey("second", arr[a]) === null) {
        transactionArr.push(
          core.dbController.linksTable.add(
            {
              type,
              first: groupId,
              second: arr[a],
            },
            true,
          ),
        );
        addedIds.push(arr[a]);
      }
    }

    for (let b = 0; b < _result.length; b++) {
      if (arr.indexOf(_result[b].second) === -1) {
        transactionArr.push(
          core.dbController.linksTable.removeByCondition(
            [
              { name: "type", operator: "=", value: type },
              { name: "first", operator: "=", value: groupId },
              { name: "second", operator: "=", value: _result[b].second },
            ],
            true,
          ),
        );
        removedIds.push(_result[b].second);
      }
    }

    await core.dbController.db.transaction(transactionArr);
    return { addedIds, removedIds };
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
    return await core.dbController.groupsDB.getByCondition(
      [
        {
          name: "owner",
          operator: "=",
          value: ownerId,
        },
      ],
      ["id", "name", "description"],
    );
  }

  async getGroupsByManager(ownerId) {
    const characters = await core.userController.getUserCharacters(ownerId);

    const groups = await Promise.all(
      characters.map((x) => this.getGroupsByModerator(x)),
    );
    const flatGroups = [...new Set(groups.flatMap((x) => x))]; // dedupe and flat

    if (flatGroups.length === 0) {
      return [];
    }

    const out = await core.dbController.groupsDB.getByCondition(
      {
        operator: "OR",
        condition: flatGroups.map((x) => ({
          name: "id",
          operator: "=",
          value: x,
        })),
      },
      ["id", "name", "description"],
    );

    return out;
  }

  async getProtectedInfo(groupId) {
    const charPr = this.getGroupCharacters(groupId);
    const corpPr = this.getGroupCorporations(groupId);
    const allyPr = this.getGroupAlliances(groupId);
    const moderatorsPr = this.getGroupModerators(groupId);

    const characters = await charPr;
    const corporations = await corpPr;
    const alliances = await allyPr;
    const moderators = await moderatorsPr;

    return {
      characters,
      corporations,
      alliances,
      moderators,
    };
  }

  async getGroupCharacters(_groupId) {
    const condition = [
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.groupToCharacter,
      },
      { name: "first", operator: "=", value: _groupId },
    ];

    const result = await core.dbController.linksTable.getByCondition(
      condition,
      ["second"],
    );
    return result.map((x) => x.second);
  }

  async getGroupCorporations(_groupId) {
    const condition = [
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.groupToCorporation,
      },
      { name: "first", operator: "=", value: _groupId },
    ];
    const result = await core.dbController.linksTable.getByCondition(
      condition,
      ["second"],
    );
    return result.map((x) => x.second * 1);
  }

  async getGroupAlliances(_groupId) {
    const condition = [
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.groupToAlliance,
      },
      { name: "first", operator: "=", value: _groupId },
    ];
    const result = await core.dbController.linksTable.getByCondition(
      condition,
      ["second"],
    );
    return result.map((x) => x.second * 1);
  }

  async getGroupModerators(_groupId) {
    const condition = [
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.groupToModerator,
      },
      { name: "first", operator: "=", value: _groupId },
    ];
    const result = await core.dbController.linksTable.getByCondition(
      condition,
      ["second"],
    );
    return result.map((x) => x.second * 1);
  }

  async getAllowedGroupListByOwner(_ownerId) {
    const groups = [];
    const characters = await core.userController.getUserCharacters(_ownerId);
    const allowedGroups = await Promise.all(
      characters.map((_characterId) =>
        this.getAllowedGroupsByCharacter(_characterId),
      ),
    );
    allowedGroups.map((_arr) => groups.merge(_arr));

    const groupsInfo = await Promise.all(
      groups.map((_groupId) => this.get(_groupId).getInfo()),
    );
    return groupsInfo;
  }

  // Allow get groups by
  // corporations
  // characters
  async getAllowedGroupsByCharacter(_characterId) {
    const corporationId = await getCorporationId(_characterId);
    const allianceId = await getAllianceId(_characterId);
    const groupsByAlliancePr = this.getGroupsByAlliance(allianceId);
    const groupsByCorporationPr = this.getGroupsByCorporation(corporationId);
    const groupsByCharacterPr = this.getGroupsByCharacter(_characterId);

    const groupsByAlliance = await groupsByAlliancePr;
    const groupsByCorporation = await groupsByCorporationPr;
    const groupsByCharacter = await groupsByCharacterPr;

    return groupsByCorporation
      .slice()
      .merge(groupsByCharacter)
      .merge(groupsByAlliance);
  }

  async getGroupsByCharacter(_characterId) {
    const condition = [
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.groupToCharacter,
      },
      { name: "second", operator: "=", value: _characterId },
    ];
    const result = await core.dbController.linksTable.getByCondition(
      condition,
      ["first"],
    );
    return result.map((_x) => _x.first);
  }

  async getGroupsByModerator(_characterId) {
    const condition = [
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.groupToModerator,
      },
      { name: "second", operator: "=", value: _characterId },
    ];
    const result = await core.dbController.linksTable.getByCondition(
      condition,
      ["first"],
    );
    return result.map((_x) => _x.first);
  }

  async getGroupsByCorporation(_corporationId) {
    const condition = [
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.groupToCorporation,
      },
      { name: "second", operator: "=", value: _corporationId },
    ];
    const result = await core.dbController.linksTable.getByCondition(
      condition,
      ["first"],
    );
    return result.map((_x) => _x.first);
  }

  async getGroupsByAlliance(_allianceId) {
    const condition = [
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.groupToAlliance,
      },
      { name: "second", operator: "=", value: _allianceId },
    ];
    const result = await core.dbController.linksTable.getByCondition(
      condition,
      ["first"],
    );
    return result.map((_x) => _x.first);
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
    const userCharacters = await core.userController.getUserCharacters(_userId);
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
    const groupCharactersPr = this.getGroupCharacters(_groupId);
    const groupCharactersByCorporationsPr =
      this.getAllowedCharactersForGroupByCorporations(_groupId, _charactersIds);
    const groupCharactersByAlliancesPr =
      this.getAllowedCharactersForGroupByAlliances(_groupId, _charactersIds);

    const groupCharacters = await groupCharactersPr;
    const groupCharactersByCorporations = await groupCharactersByCorporationsPr;
    const groupCharactersByAlliances = await groupCharactersByAlliancesPr;

    const crossCharactersByCharacters = Array.cross(
      _charactersIds,
      groupCharacters,
    );
    const crossCharactersByCorporations = Array.cross(
      _charactersIds,
      groupCharactersByCorporations,
    );
    const crossCharactersByAlliances = Array.cross(
      _charactersIds,
      groupCharactersByAlliances,
    );

    const characterIds = crossCharactersByCharacters
      .merge(crossCharactersByCorporations)
      .merge(crossCharactersByAlliances);

    const prarrTracks = [];
    const prarrCharacterNames = [];
    for (let a = 0; a < characterIds.length; a++) {
      prarrTracks.push(this.getCharacterTrack(_groupId, characterIds[a]));
      prarrCharacterNames.push(getCharacterName(characterIds[a]));
    }

    const trackArr = await Promise.all(prarrTracks);
    const namesArr = await Promise.all(prarrCharacterNames);
    return characterIds.map((id, index) => ({
      id: characterIds[index],
      track: trackArr[index],
      name: namesArr[index],
    }));
  }

  async getAllowedCharactersForGroupByCorporations(_groupId, _characterIds) {
    const corporationIdsPr = Promise.all(
      _characterIds.map((charId) => getCorporationId(charId)),
    );
    const groupCorporationsPr = this.getGroupCorporations(_groupId);

    const corporationIds = await corporationIdsPr;
    const groupCorporations = await groupCorporationsPr;

    const gcMap = groupCorporations.convertToMap();

    const out = [];
    corporationIds.map(
      (x, i) => x !== -1 && gcMap[x] && out.push(_characterIds[i]),
    );
    return out;
  }

  async getAllowedCharactersForGroupByAlliances(_groupId, _characterIds) {
    const allianceIdsPr = Promise.all(
      _characterIds.map((charId) => getAllianceId(charId)),
    );
    const groupAlliancesPr = this.getGroupAlliances(_groupId);

    const allianceIds = await allianceIdsPr;
    const groupAlliances = await groupAlliancesPr;

    const gaMap = groupAlliances.convertToMap();

    const out = [];
    allianceIds.map(
      (x, i) => x !== -1 && gaMap[x] && out.push(_characterIds[i]),
    );
    return out;
  }

  async updateAllowedCharactersForGroup(_userId, _groupId, _characters) {
    await Promise.all(
      _characters.map((_character) =>
        this.updateCharacterTrack(_groupId, _character.id, _character.track),
      ),
    );
    await core.mapController.notifyAllowedMapsByUser(_userId);
  }

  /**
   *
   * @param _groupId
   * @return {Promise<number[]>}
   */
  async getMapsByGroup(_groupId) {
    const cond = [
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.mapToGroups,
      },
      { name: "second", operator: "=", value: _groupId },
    ];
    const result = await core.dbController.linksTable.getByCondition(cond, [
      "first",
    ]);
    return result.map((x) => x.first);
  }

  async getCharacterTrack(_groupId, _characterId) {
    const condition = [
      { name: "groupId", operator: "=", value: _groupId },
      { name: "characterId", operator: "=", value: _characterId },
    ];
    const result = await core.dbController.groupToCharacterTable.getByCondition(
      condition,
      ["track"],
    );
    return result.length === 1 ? result[0].track : false;
  }

  async removeCharactersFromTracking(_groupId, _characterIds) {
    if (_characterIds.length > 0) {
      await core.dbController.groupToCharacterTable.removeByCondition({
        left: { name: "groupId", operator: "=", value: _groupId },
        operator: "AND",
        right: {
          operator: "OR",
          condition: _characterIds.map((x) => ({
            name: "characterId",
            operator: "=",
            value: x,
          })),
        },
      });
    }
  }

  async removeGroupCharactersFromTracking(_groupId) {
    await core.dbController.groupToCharacterTable.removeByCondition([
      {
        name: "groupId",
        operator: "=",
        value: _groupId,
      },
    ]);
  }

  async getTrackedCharactersByGroup(_groupId) {
    const condition = [{ name: "groupId", operator: "=", value: _groupId }];
    const result = await core.dbController.groupToCharacterTable.getByCondition(
      condition,
      ["characterId"],
    );
    return result.map((_data) => _data.characterId);
  }

  /**
   *
   * @param {string} _characterId
   * @return {Promise<string[]>}
   */
  async getGroupsByTrackedCharacterId(_characterId) {
    const condition = [
      { name: "characterId", operator: "=", value: _characterId },
      { name: "track", operator: "=", value: true },
    ];
    const groups = await core.dbController.groupToCharacterTable.getByCondition(
      condition,
      ["groupId"],
    );
    return groups.map((x) => x.groupId);
  }

  async updateCharacterTrack(_groupId, _characterId, _track) {
    const condition = [
      { name: "groupId", operator: "=", value: _groupId },
      { name: "characterId", operator: "=", value: _characterId },
    ];

    const result = await core.dbController.groupToCharacterTable.getByCondition(
      condition,
      ["track"],
    );
    const isExist = result.length > 0;
    if (isExist && result[0].track !== _track) {
      const maps = await core.groupsController.getMapsByGroup(_groupId);
      await core.dbController.groupToCharacterTable.setByCondition(condition, {
        track: _track,
      });
      await core.mapController.updateCharacterTrackStatus(
        maps,
        _characterId,
        _track,
      );
    } else if (!isExist && _track) {
      const maps = await core.groupsController.getMapsByGroup(_groupId);
      await core.dbController.groupToCharacterTable.add({
        groupId: _groupId,
        characterId: _characterId,
        track: _track,
      });
      await core.mapController.updateCharacterTrackStatus(
        maps,
        _characterId,
        true,
      );
    }
  }

  async _removeCharacters(groupId) {
    await core.dbController.linksTable.removeByCondition([
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.groupToCharacter,
      },
      { name: "first", operator: "=", value: groupId },
    ]);
  }

  async _removeCorporations(groupId) {
    await core.dbController.linksTable.removeByCondition([
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.groupToCorporation,
      },
      { name: "first", operator: "=", value: groupId },
    ]);
  }

  async _removeAlliances(groupId) {
    await core.dbController.linksTable.removeByCondition([
      {
        name: "type",
        operator: "=",
        value: DBController.linksTableTypes.groupToAlliance,
      },
      { name: "first", operator: "=", value: groupId },
    ]);
  }
}

module.exports = GroupsController;
