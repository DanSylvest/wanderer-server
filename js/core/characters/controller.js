/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/21/20.
 */

var Emitter       = require("./../../env/tools/emitter");
var Character     = require("./character");
var classCreator  = require("./../../env/tools/class");
var CustomPromise = require("./../../env/promise");
var DBController  = require("./../../core/dbController");

var Controller = classCreator("CharactersController", Emitter, {
    constructor: function CharactersController() {
        Emitter.prototype.constructor.call(this);

        this._characters = Object.create(null);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    has: function (_characterId) {
        return !!this._characters[_characterId];
    },
    get: function (_characterId) {
        if (!this.has(_characterId)) {
            this._add(_characterId, new Character({characterId: _characterId}));
        }

        return this._characters[_characterId];
    },
    remove: function (_characterId) {
        this._characters[_characterId].destructor();
        delete this._characters[_characterId];
    },
    _add: function (_characterId, _characterInstance) {
        this._characters[_characterId] = _characterInstance;
    },
    connectionBreak: function (_connectionId) {
        for (var characterId in this._characters) {
            this._characters[characterId].connectionBreak(_connectionId);
        }
    },
    searchInEve: function (_match) {
        var pr = new CustomPromise();

        var countForShow = 12;
        var characterIds = [];

        core.esiApi.search(["character"], _match).then(function (_event) {
            characterIds = _event.character || [];

            var prarr = [];
            for (var a = 0; a < countForShow && a < characterIds.length; a++) {
                prarr.push(core.esiApi.characters.info(characterIds[a]));
            }

            return Promise.all(prarr);
        }.bind(this), function (_err) {
            debugger;
        }.bind(this)).then(function (_arr) {
            var out = [];
            for (var a = 0; a < _arr.length; a++) {
                if (_arr[a].name.indexOf(_match) === -1)
                    continue;

                out.push({
                    id: characterIds[a],
                    name: _arr[a].name
                });
            }

            out.sort(function (a, b) {
                return a.name > b.name ? 1 : a.name < b.name ? -1 : 0
            });

            pr.resolve(out);
        }.bind(this), function (_err) {
            debugger;
        }.bind(this));

        return pr.native;
    },

    fastSearch: function (_options) {
        switch (_options.type) {
            case "byAll":
                return this.searchInEve(_options.match);
            case "byUser":
                break;
        }
    },
    /**
     *
     * @param _characterId
     * @param {string} _type - may be "local", or "global" - when local will be get info by added character
     * default "global"
     * @returns {*}
     */
    getCharInfo: async function (_characterId, _type) {
        // todo где-то вот тут проверять нужно ли запрашивать данные по корпе заного
        switch (_type) {
            case "local":
                break;
            case "global": // load info from eve server
                let result = await core.esiApi.characters.info(_characterId);
                return {name: result.name};
            case "all":
                return this.get(_characterId).getInfo();
        }
    },
    removeCharacter: async function (_userId, _characterId) {
        var pr = new CustomPromise();

        try {
            // найти в каких группах этот персонаж участвует, и оповестить карты, что его нужно убрать с отслеживания
            // найти все группы

            var condition = [
                {name: "characterId", operator: "=", value: _characterId},
                {name: "track", operator: "=", value: true},
            ];

            var result = await core.dbController.groupToCharacterTable.getByCondition(condition, ["groupId"]);

            var groups = Object.create(null);
            for (var a = 0; a < result.length; a++) {
                var groupId = result[a].groupId;
                groups[groupId] = [_characterId];
            }

            var filteredMaps = await core.mapController.getMapsByGroupsWithCharacters(groups);

            var prarr = [];
            for(var mapId in filteredMaps) {
                prarr.push(core.mapController.offlineCharacters(mapId, filteredMaps[mapId]));
            }

            // дождемся когда все персонажи будут отключены
            await Promise.all(prarr);

            if (this.has(_characterId)) {
                this.remove(_characterId);
            }

            var ltCondition = [
                {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter},
                {name: "first", operator: "=", value: _userId},
                {name: "second", operator: "=", value: _characterId},
            ];
            var gtCondition = [{name: "characterId", operator: "=", value: _characterId}];

            var trArr = [];
            trArr.push(core.dbController.charactersDB.remove(_characterId, true));
            trArr.push(core.dbController.linksTable.removeByCondition(ltCondition, true));
            trArr.push(core.dbController.groupToCharacterTable.removeByCondition(gtCondition, true));

            await core.dbController.db.transaction(trArr);

            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }


        return pr.native;
    },
    getAllCharacters: async function () {
        var pr = new CustomPromise();

        var condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter}
        ]

        try {
            var characterIds = await core.dbController.linksTable.getByCondition(condition, ["second"]);
            var out = characterIds.map(characterId => characterId.second)
            pr.resolve(out);
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    getAllCharactersByOnlineUser: async function () {
        var pr = new CustomPromise();

        var condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.userToCharacter}
        ]

        try {
            var characterIds = await core.dbController.linksTable.getByCondition(condition, ["second"]);
            var out = characterIds.map(characterId => characterId.second)
            pr.resolve(out);
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    }
});


module.exports = Controller;