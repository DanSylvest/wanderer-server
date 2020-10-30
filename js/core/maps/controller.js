/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/21/20.
 */

const Emitter       = require("./../../env/tools/emitter");
const classCreator  = require("./../../env/tools/class");
const extend        = require("./../../env/tools/extend");
const exist         = require("./../../env/tools/exist");
const CustomPromise = require("./../../env/promise");
const printf        = require("./../../env/tools/print_f");
const log           = require("./../../utils/log");
const DBController  = require("./../dbController");
const Map           = require("./map");
const md5           = require("md5");

const MapController = classCreator("MapController", Emitter, {
    constructor: function MapController() {
        Emitter.prototype.constructor.call(this);

        this._maps = Object.create(null);
        this._onlineUsers = Object.create(null);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },

    init: async function () {
        let pr = new CustomPromise();

        let allMaps = await this.getAllMaps();
        await Promise.all(allMaps.map(_map => this.get(_map.id).init()));
        pr.resolve();

        return pr.native;
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
            delete this._maps[_mapId];
        }
    },
    _add: function (_mapId, _mapInstance) {
        this._maps[_mapId] = _mapInstance;
    },
    connectionBreak: function (_connectionId) {
        for(let mapId in this._maps) {
            this._maps[mapId].connectionBreak(_connectionId);
        }
    },

    offlineCharacters: async function (_mapId, _characters) {
        let pr = new CustomPromise();

        try {
            if(this._maps[_mapId]) {
                await this._maps[_mapId].offlineCharacters(_characters);
                pr.resolve();
            }
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    userOffline: async function (_userId) {
        this._onlineUsers[_userId].tid = setTimeout(function (_userId) {
            this._onlineUsers[_userId].tid = -1;
            this._userOffline(_userId);
        }.bind(this, _userId), 10000);
    },
    _userOffline: async function (_userId) {
        log(log.INFO, "User [%s] now is offline.", _userId);

        try {
            let filteredGroups = await core.groupsController.getGroupWithCharactersByUser(_userId);
            let filteredMaps = await this.getMapsByGroupsWithCharacters(filteredGroups);

            // А вот теперь оповестим карты о добавлении нового персонажа на отслеживание
            for(let mapId in filteredMaps) {
                this._maps[mapId] && this._maps[mapId].offlineCharacters(filteredMaps[mapId])
            }
        } catch (_err) {
            debugger;
        }
    },
    /**
     * todo
     * кроме того этот процесс может оборваться, и что тогда делать?
     * не тестировано - надо протетсировать
     * сделать несколько групп, несколько карт и несколько персонажей
     * проерить корректность смешивания
     * @param _userId
     * @returns {Promise<void>}
     */
    userOnline: async function (_userId) {
        if(!this._onlineUsers[_userId]) {
            this._onlineUsers[_userId] = {
                tid: -1
            }
        } else if(this._onlineUsers[_userId].tid !== -1) {
            clearTimeout(this._onlineUsers[_userId].tid);
            this._onlineUsers[_userId].tid = -1;
            return;
        }
        log(log.INFO, "User [%s] now is online.", _userId);
        try {
            let filteredGroups = await core.groupsController.getGroupWithCharactersByUser(_userId);
            let filteredMaps = await this.getMapsByGroupsWithCharacters(filteredGroups);

            // А вот теперь оповестим карты о добавлении нового персонажа на отслеживание
            for(let mapId in filteredMaps) {
                let map = this._maps[mapId];

                if(map) {
                    map.addCharactersToObserve(filteredMaps[mapId]);
                } else {
                    this.get(mapId).addCharactersToObserve(filteredMaps[mapId]);
                }
            }
        } catch (_err) {
            debugger;
        }
    },
    updateCharacterStatus: async function (_groupId, _characterId, _track) {
        let pr = new CustomPromise();

        try {
            let groups = Object.create(null);
            groups[_groupId] = [_characterId];

            let filteredMaps = await this.getMapsByGroupsWithCharacters(groups);

            for (let mapId in filteredMaps) {
                let map = this._maps[mapId];

                if (map) {
                    if (_track)
                        map.addCharactersToObserve(filteredMaps[mapId]);
                    else
                        map.offlineCharacters(filteredMaps[mapId]);
                } else if (!map && _track) {
                    this.get(mapId).addCharactersToObserve(filteredMaps[mapId]);
                }
            }
            pr.resolve();
        } catch (_err) {
            pr.reject(_err)
        }

        return pr.native;
    },
    getMapsByGroupsWithCharacters: async function (_input) {
        let pr = new CustomPromise();

        try {
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
                    let mapId = mapIds[b].first;

                    if (!filteredMaps[mapId]) {
                        filteredMaps[mapId] = []
                    }
                    filteredMaps[mapId].merge(groupInfo.characterIds);
                }
            }

            pr.resolve(filteredMaps)
        } catch (_err) {
            debugger;
            pr.reject(_err)
        }

        return pr.native;
    },
    _removeGroups: function (_mapId) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type",operator: "=",value: DBController.linksTableTypes.mapToGroups},
            {name: "first",operator: "=",value: _mapId}
        ];

        core.dbController.linksTable.removeByCondition(condition).then(function () {
            pr.resolve();
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    _updateGroups: async function (_mapId, _groups) {
        let pr = new CustomPromise();

        var condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.mapToGroups},
            {name: "first", operator: "=", value: _mapId}
        ];

        try {
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
            pr.resolve({added: added, removed: removed});
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    /**
     *
     * @param _owner - is mapper user id
     * @param _data
     * @returns {Promise<any> | Promise<unknown>}
     */
    createMap: async function (_owner, _data) {
        let pr = new CustomPromise();

        let id = md5(config.app.solt + "_" + +new Date);

        let props = {
            id: id,
            owner: _owner,
            name: _data.name,
            description: _data.description,
            private: _data.private
        };

        try {
            await core.dbController.mapsDB.add(props);
            await this._updateGroups(id, _data.groups);

            // Поставить на отслеживание всех персонажей, которым выставлен флаг track в true
            await Promise.all(_data.groups.map(_groupId => this.onlineCharactersByGroup(id, _groupId)));
            pr.resolve(id);
        } catch(_err) {
            pr.reject({
                sub: _err,
                message: "Error on add in mapsDB - update groups"
            });
        }

        return pr.native;
    },
    editMap: async function (_mapId, _props) {
        let pr = new CustomPromise();

        try {
            let groups = await this._updateGroups(_mapId, _props.groups);
            await Promise.all(groups.removed.map(_groupId => this.offlineCharactersByGroup(_mapId, _groupId)));
            await Promise.all(groups.added.map(_groupId => this.onlineCharactersByGroup(_mapId, _groupId)));

            delete _props.groups;
            await core.dbController.mapsDB.set(_mapId, _props);

            pr.resolve();
        } catch (_err) {
            pr.reject({
                sub: _err,
                message: "Error on edit in mapsDB - update groups"
            });
        }

        return pr.native;
    },
    offlineCharactersByGroup: async function (mapId, groupId) {
        let charactersPr = core.groupsController.getGroupCharacters(groupId);
        let corporationsPr = core.groupsController.getGroupCorporations(groupId);
        let alliancesPr = core.groupsController.getGroupAlliances(groupId);
        let characters = await charactersPr;
        let corporations = await corporationsPr;
        let alliances = await alliancesPr;
        await core.groupsController.actualMapTrackingCharactersOffline(mapId, groupId, characters, corporations, alliances);
    },
    onlineCharactersByGroup: async function (mapId, groupId) {
        let charactersPr = core.groupsController.getGroupCharacters(groupId);
        let corporationsPr = core.groupsController.getGroupCorporations(groupId);
        let alliancesPr = core.groupsController.getGroupAlliances(groupId);
        let characters = await charactersPr;
        let corporations = await corporationsPr;
        let alliances = await alliancesPr;
        await core.groupsController.actualMapTrackingCharactersOnline(mapId, groupId, characters, corporations, alliances);
    },
    /**
     * А ведь это не так тривиально как кажется, да?
     *  - удалить все слинкоанные с картой группы
     *  - удалить сам объект карты (но это просто остановка работы механизма карты)
     *  - удалить из бд mapLinksTable все линки
     *  - удалить из бд mapSystemsTable все системы с их параметрами
     *  - удалить из бд mapSystemToCharacterTable связи персонажей с картой
     * @param _mapId
     * @returns {Promise<unknown>}
     */
    removeMap: async function (_mapId) {
        let pr = new CustomPromise();

        try {
            let trArr = [];
            trArr.push(core.dbController.mapLinksTable.removeByCondition([
                {name: "mapId", operator: "=", value: _mapId}
            ], true))

            trArr.push(core.dbController.mapSystemsTable.removeByCondition([
                {name: "mapId", operator: "=", value: _mapId}
            ], true));

            trArr.push(core.dbController.mapSystemToCharacterTable.removeByCondition([
                {name: "mapId", operator: "=", value: _mapId}
            ], true));

            await core.dbController.db.transaction(trArr);
            await this._removeGroups(_mapId);
            await core.dbController.mapsDB.remove(_mapId);
            this.remove(_mapId);
            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    getMapList: function () {

    },
    getMapListByOwner: async function (_ownerId) {
        let pr = new CustomPromise();

        let condition = [{name: "owner", operator: "=", value: _ownerId}];
        let attributes = ["id", "name", "description", "owner", "private"];

        try {
            let mapListPr = core.dbController.mapsDB.getByCondition(condition, attributes);
            let userNamePr = core.userController.getUserName(_ownerId);

            let mapList = await mapListPr;
            let userName = await userNamePr;
            let mapsGroups = await Promise.all(mapList.map(_mapInfo => this.getMapGroups(_mapInfo.id)));

            for (let a = 0; a < mapList.length; a++) {
                mapList[a].groups = mapsGroups[a];
                mapList[a].owner = userName;
            }

            pr.resolve(mapList);
        } catch (_err) {
            pr.reject();
        }

        return pr.native;
    },

    getMapInfo: async function (_mapId) {
        let pr = new CustomPromise();

        try {
            let info = await core.dbController.mapsDB.get(_mapId, core.dbController.mapsDB.attributes());
            pr.resolve(info);
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },

    getMapGroups: async function (_mapId) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.mapToGroups},
            {name: "first", operator: "=", value: _mapId}
        ];

        try {
            let resultPr = core.dbController.linksTable.getByCondition(condition, ["second"]);
            let result = await resultPr;
            let out = result.map(_res => _res.second);

            pr.resolve(out)
        } catch (_err) {
            pr.reject();
        }

        return pr.native;
    },

    getMapsByGroup: async function (_groupId) {
        let pr = new CustomPromise();

        try {
            let condition = [
                {name: "type", operator: "=", value: DBController.linksTableTypes.mapToGroups},
                {name: "second", operator: "=", value: _groupId}
            ];
            let result = await core.dbController.linksTable.getByCondition(condition, ["first"]);
            pr.resolve(result);
        } catch (_err) {
            pr.resolve(_err);
        }

        return pr.native;
    },

    getAllMaps: async function () {
        let pr = new CustomPromise();
        let maps = await core.dbController.mapsDB.all();
        pr.resolve(maps);
        return pr.native;
    }

});




module.exports = MapController;