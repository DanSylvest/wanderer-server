/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/21/20.
 */

const NodeCache = require("node-cache");
const Emitter = require("../../env/_new/tools/emitter");
const Character = require("./character");
const CustomPromise = require("../../env/promise");
const DBController = require("../dbController");
const log = require("../../utils/log");

// const SEARCH_LIMIT = 12;

class Controller extends Emitter {
  constructor() {
    super();

    this._characters = Object.create(null);
    this.infoCache = new NodeCache({
      stdTTL: 60 * 60,
      checkperiod: 60 * 10,
      useClones: false,
    });
  }

  has(_characterId) {
    return !!this._characters[_characterId];
  }

  /**
   *
   * @param _characterId
   * @returns {Character}
   */
  get(_characterId) {
    if (_characterId === undefined) {
      log(log.ERR, "-------------------");
      log(
        log.ERR,
        'Character ID could not be undefined. Debbug it in "characters/controller.js:35"',
      );
      log(log.ERR, "-------------------");
    }

    if (!this.has(_characterId)) {
      this._add(_characterId, new Character({ characterId: _characterId }));
    }

    return this._characters[_characterId];
  }

  remove(_characterId) {
    this._characters[_characterId].destructor();
    delete this._characters[_characterId];
  }

  _add(_characterId, _characterInstance) {
    this._characters[_characterId] = _characterInstance;
  }

  connectionBreak(_connectionId) {
    for (const characterId in this._characters) {
      this._characters[characterId].connectionBreak(_connectionId);
    }
  }

  /**
   * Now it used for fast loading data for search by characters
   * But i think it can work at client side
   * @param characterId
   * @returns {Promise | Promise<{
   *     allianceId {number | undefined}
   *     ancestryId {number}
   *     birthday {Date}
   *     bloodlineId {number}
   *     corporationId {number | undefined}
   *     description {string}
   *     gender {string}
   *     name {string}
   *     raceId {number}
   * }>}
   */
  async getPublicCharacterInfo(characterId) {
    if (this.infoCache.has(characterId)) {
      return this.infoCache.get(characterId);
    }

    try {
      // TODO here call a characterInfo
      const info = await core.esiApi.characters.info(characterId);
      this.infoCache.set(characterId, info);
      return info;
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      return null;
    }
  }

  /**
   *
   * @param _characterId
   * @returns {Promise<{name: string, addDate: Date}>}
   */
  async getProtectedCharacterInfo(_characterId) {
    const { name, addDate } = await core.dbController.charactersDB.get(
      _characterId,
      ["name", "addDate"],
    );
    return { name, addDate };
  }

  async searchInEve(_match) {
    let result = Object.create(null);

    try {
      result = await core.esiApi.search(["character"], _match);
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      return [];
    }

    const characterIds =
      (result.character && result.character.slice(0, 15)) || [];

    const infoArr = await Promise.all(
      characterIds.map((x) => this.getPublicCharacterInfo(x)),
    );

    return infoArr
      .map((x, i) => ({ id: characterIds[i], data: x }))
      .filter((x) => x.data !== null)
      .map(({ id, data }) => ({ id, name: data.name }))
      .sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
  }

  fastSearch(_options) {
    switch (_options.type) {
      case "byAll":
        return this.searchInEve(_options.match);
      case "byUser":
        break;
    }
  }

  /**
   * TODO !Attention!
   * this method should be refactored as fast as it can
   * @param _userId
   * @param _characterId
   * @returns {Promise<unknown>}
   */
  async removeCharacter(_userId, _characterId) {
    const pr = new CustomPromise();

    try {
      // найти в каких группах этот персонаж участвует, и оповестить карты, что его нужно убрать с отслеживания
      // найти все группы

      const condition = [
        { name: "characterId", operator: "=", value: _characterId },
        { name: "track", operator: "=", value: true },
      ];

      const result =
        await core.dbController.groupToCharacterTable.getByCondition(
          condition,
          ["groupId"],
        );

      const groups = Object.create(null);
      for (let a = 0; a < result.length; a++) {
        const { groupId } = result[a];
        groups[groupId] = [_characterId];
      }

      const filteredMaps =
        await core.mapController.getMapsByGroupsWithCharacters(groups);

      const prarr = [];
      for (const mapId in filteredMaps) {
        prarr.push(
          core.mapController.removeCharactersFromObserve(
            _userId,
            mapId,
            filteredMaps[mapId],
          ),
        );
      }

      // дождемся когда все персонажи будут отключены
      await Promise.all(prarr);

      if (this.has(_characterId)) {
        this.remove(_characterId);
      }

      const ltCondition = [
        {
          name: "type",
          operator: "=",
          value: DBController.linksTableTypes.userToCharacter,
        },
        { name: "first", operator: "=", value: _userId },
        { name: "second", operator: "=", value: _characterId },
      ];
      const gtCondition = [
        { name: "characterId", operator: "=", value: _characterId },
      ];

      const trArr = [];
      trArr.push(core.dbController.charactersDB.remove(_characterId, true));
      trArr.push(
        core.dbController.linksTable.removeByCondition(ltCondition, true),
      );
      trArr.push(
        core.dbController.groupToCharacterTable.removeByCondition(
          gtCondition,
          true,
        ),
      );

      await core.dbController.db.transaction(trArr);

      pr.resolve();
    } catch (_err) {
      pr.reject(_err);
    }

    return pr.native;
  }

  serverStatusOffline() {
    for (const id in this._characters) {
      this._characters[id].serverStatusOffline();
    }
  }

  serverStatusOnline() {
    for (const id in this._characters) {
      this._characters[id].serverStatusOnline();
    }
  }
}

module.exports = Controller;
