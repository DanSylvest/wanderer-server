/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/21/20.
 */

const Emitter       = require("./../env/tools/emitter");
const Group         = require("./group");
const classCreator  = require("./../env/tools/class");
const CustomPromise = require("./../env/promise");
const printf        = require("./../env/tools/print_f");
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
        for (var mapId in this._groups) {
            this._groups[mapId].connectionBreak(_connectionId);
        }
    },
    /**
     *
     * @param _owner - is group user id
     * @param _data
     * @param _data.characters
     * @param _data.corporations
     * @param _data.alliances
     * @param _data.name
     * @param _data.description
     * @returns {Promise<any> | Promise<unknown>}
     */
    createGroup: async function (_owner, _data) {
        var pr = new CustomPromise();

        var id = md5(config.app.solt + "_" + +new Date);

        try {
            let updCharactersPr = this._updateCharacters(id, _data.characters);
            let updCorporationsPr = this._updateCorporations(id, _data.corporations);
            let updAlliancesPr = this._updateAlliances(id, _data.alliances);
            let updPropsPr = core.dbController.groupsDB.add({
                id: id,
                owner: _owner,
                name: _data.name,
                description: _data.description
            });

            await updCharactersPr;
            await updCorporationsPr;
            await updAlliancesPr;
            await updPropsPr;

            pr.resolve(id);

        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    removeGroup: async function (_groupId) {
        // before remove group, we should check if map use the group by default
        // after we should remove group from map
        // we can't remove it
        // otherwise
        // after we should remove links characters to group +
        // after we should remove links corporations to group +
        // after we should remove links alliances to group -

        let pr = new CustomPromise();

        try {
            let maps = await this.getMapsWhereGroup(_groupId);
            if (maps.length > 0) {
                pr.reject({
                    message: printf("Group can not be removed: map(s) [%s] use this group", maps.join(", "))
                });
            } else {
                await this._removeCharacters(_groupId);
                await this._removeCorporations(_groupId);
                await this._removeAlliances(_groupId);
                await this.removeGroupCharactersFromTracking(_groupId);
                await core.dbController.groupsDB.remove(_groupId);
                this.remove(_groupId);
                pr.resolve();
            }
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    editGroup: async function (_groupId, _props) {
        let pr = new CustomPromise();

        try {
            let updCharactersPr = this._updateCharacters(_groupId, _props.characters);
            let updCorporationsPr = this._updateCorporations(_groupId, _props.corporations);
            let updAlliancesPr = this._updateAlliances(_groupId, _props.alliances);

            let characters = await updCharactersPr;
            let corporations = await updCorporationsPr;
            let alliances = await updAlliancesPr;

            let offlineCharacterIds = await this.actualMapTrackingCharactersOffline(null, _groupId, characters.removed, corporations.removed, alliances.removed);
            await this.actualMapTrackingCharactersOnline(null, _groupId, characters.added, corporations.added, alliances.added);
            await this.removeCharactersFromTracking(_groupId, offlineCharacterIds);

            await core.dbController.groupsDB.set(_groupId, {
                name: _props.name,
                description: _props.description
            });

            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    /**
     * Эта функция нужна, для того что бы убрать отслеживаемых персонажей с карты
     *
     * Когда мы обновляем список персонажей или корпораций или альянсов для группы,
     * группа может быть присоеденина к большому кол-ву карт, а значит,
     * нам надо определить каких персонажей и какие карты нам надо обновить, то бишь,
     * убрать с отслеживания или поставить на отслеживание персонажей
     *
     * @param _mapId
     * @param _groupId
     * @param characters
     * @param corporations
     * @param alliances
     * @returns {Promise<unknown>}
     */
    actualMapTrackingCharactersOffline: async function (_mapId, _groupId, characters, corporations, alliances) {
        characters = characters.map(x => x.toString());
        corporations = corporations.map(x => x.toString());
        alliances = alliances.map(x => x.toString());

        let pr = new CustomPromise();

        try {
            // Надем всех персонажей для этой группы
            let trackedCharacterIds = await this.getTrackedCharactersByGroup(_groupId);

            // Запросим для каждого персонажа этой группы корпорацию и альянс
            let charactersCorporations = await Promise.all(trackedCharacterIds.map(_characterId => core.charactersController.get(_characterId).getCorporationId()));
            let charactersAlliances = await Promise.all(trackedCharacterIds.map(_characterId => core.charactersController.get(_characterId).getAllianceId()));

            // У нас может быть ID корпорации стрингой а может быть интом, поэтому приведем к стринге
            charactersCorporations = charactersCorporations.map(_x => _x.toString());
            charactersAlliances = charactersAlliances.map(_x => _x.toString());

            // Для корпораций оставим только тех персонажей, которые удовлетворяют корпорациям и альянсам
            let charactersByCorporations = trackedCharacterIds.filter(function (_characterId, _index) {
                return corporations.indexOf(charactersCorporations[_index]) !== -1;
            });
            let charactersByAlliances = trackedCharacterIds.filter(function (_characterId, _index) {
                return alliances.indexOf(charactersAlliances[_index]) !== -1;
            });

            // Создадим массив IDов персонажей и добавим к ним персонажей из альянсов и корпораций
            let characterIds = characters.slice();
            characterIds.merge(charactersByCorporations);
            characterIds.merge(charactersByAlliances);

            // Получим информацию по аккаунту, онлайн ли владелец персонажа или нет
            let onlineToCharacterIds = await Promise.all(characterIds.map(_characterId => core.charactersController.get(_characterId).getOwnerUserOnline()));

            // Отфильтруем персонажей, чьи владельцы офлайн
            characterIds = characterIds.filter((_characterId, _index) => onlineToCharacterIds[_index]);

            // Список ID'ов карт, к которым прикреплена эта группа
            let mapIds = null;
            if(!exist(_mapId))
                mapIds = (await core.mapController.getMapsByGroup(_groupId)).map(x => x.first);
            else
                mapIds = [_mapId];

            // Отключим
            await Promise.all(mapIds.map(_mapId => core.mapController.get(_mapId).offlineCharacters(characterIds)));

            pr.resolve(characterIds);
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    /**
     * Эта функция нужна, для того что бы добавить персонажей на карту, для отслеживания
     *
     * @param _mapId
     * @param _groupId
     * @param characters
     * @param corporations
     * @param alliances
     * @returns {Promise<unknown>}
     */
    actualMapTrackingCharactersOnline: async function (_mapId, _groupId, characters, corporations, alliances) {
        characters = characters.map(x => x.toString());
        corporations = corporations.map(x => x.toString());
        alliances = alliances.map(x => x.toString());

        let pr = new CustomPromise();

        try {
            // Надем всех персонажей для этой группы
            let trackedCharacterIds = await this.getTrackedCharactersByGroup(_groupId);

            // Запросим для каждого персонажа этой группы корпорацию
            let charactersCorporations = await Promise.all(trackedCharacterIds.map(_characterId => core.charactersController.get(_characterId).getCorporationId()));
            let charactersAlliances = await Promise.all(trackedCharacterIds.map(_characterId => core.charactersController.get(_characterId).getAllianceId()));

            // У нас может быть ID корпорации стрингой а может быть интом, поэтому приведем к стринге
            charactersCorporations = charactersCorporations.map(_x => _x.toString());
            charactersAlliances = charactersAlliances.map(_x => _x.toString());

            // Для корпораций оставим только тех персонажей, которые удовлетворяют корпорациям
            let charactersByCorporations = trackedCharacterIds.filter(function (_characterId, _index) {
                return corporations.indexOf(charactersCorporations[_index]) !== -1;
            });
            let charactersByAlliances = trackedCharacterIds.filter(function (_characterId, _index) {
                return alliances.indexOf(charactersAlliances[_index]) !== -1;
            });

            // Создадим массив IDов персонажей,
            let characterIds = characters.slice();
            characterIds.merge(charactersByCorporations);
            characterIds.merge(charactersByAlliances);

            // Получим информацию по аккаунту, онлайн ли владелец персонажа или нет
            let onlineToCharacterIds = await Promise.all(characterIds.map(_characterId => core.charactersController.get(_characterId).getOwnerUserOnline()));

            // Отфильтруем персонажей, чьи владельцы офлайн
            characterIds = characterIds.filter((_characterId, _index) => onlineToCharacterIds[_index]);

            // Список ID'ов карт, к которым прикреплена эта группа
            let mapIds = null;
            if(!exist(_mapId))
                mapIds = (await core.mapController.getMapsByGroup(_groupId)).map(x => x.first);
            else
                mapIds = [_mapId];

            // Отключим от всех карт персонажей
            await Promise.all(mapIds.map(_mapId => core.mapController.get(_mapId).addCharactersToObserve(characterIds)));

            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    _updateCharacters: async function (_groupId, _characters) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
            {name: "first", operator: "=", value: _groupId}
        ];

        try {
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
            pr.resolve({
                added: addedCharacterIds,
                removed: removedCharacterIds
            });
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    _updateCorporations: async function (_groupId, _corporations) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCorporation},
            {name: "first", operator: "=", value: _groupId}
        ];

        try {
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

            pr.resolve({added: added, removed: removed});
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    _updateAlliances: async function (_groupId, _alliances) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToAlliance},
            {name: "first", operator: "=", value: _groupId}
        ];

        try {
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

            pr.resolve({added: added, removed: removed});
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    getGroupListByOwner: async function (_ownerId) {
        let pr = new CustomPromise();

        let condition = [{name: "owner", operator: "=", value: _ownerId}];

        try {
            let ownerNamePr = core.userController.getUserName(_ownerId);
            let groupListPr = core.dbController.groupsDB.getByCondition(condition, ["id", "name", "description", "owner"]);
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

            pr.resolve(groupList);

        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    existsCharacterInGroup: function (_groupId, _characterId) {
        var pr = new CustomPromise();

        var condition = [
            {name: "type",operator: "=",value: DBController.linksTableTypes.groupToCharacter},
            {name: "first",operator: "=",value: _groupId},
            {name: "second",operator: "=",value: _characterId}
        ];

        core.dbController.linksTable.existsByCondition(condition).then(function (_exists) {
            pr.resolve(_exists);
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    getGroupCharacters: function (_groupId) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
            {name: "first", operator: "=", value: _groupId}
        ];

        core.dbController.linksTable.getByCondition(condition, ["second"]).then(function (_result) {
            pr.resolve(_result.map(_data => _data.second));
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    getGroupCorporations: function (_groupId) {
        var pr = new CustomPromise();

        var condition = [
            {name: "type",operator: "=",value: DBController.linksTableTypes.groupToCorporation},
            {name: "first",operator: "=",value: _groupId}
        ];

        core.dbController.linksTable.getByCondition(condition, ["second"]).then(function (_result) {
            pr.resolve(_result.map(_data => _data.second * 1));
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    getGroupAlliances: function (_groupId) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type",operator: "=",value: DBController.linksTableTypes.groupToAlliance},
            {name: "first",operator: "=",value: _groupId}
        ];

        core.dbController.linksTable.getByCondition(condition, ["second"]).then(function (_result) {
            pr.resolve(_result.map(_data => _data.second * 1));
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    getAllowedGroupListByOwner: async function (_ownerId) {
        let pr = new CustomPromise();

        let groups = [];

        try {
            let characters = await core.userController.getUserCharacters(_ownerId);
            let allowedGroups = await Promise.all(characters.map(_characterId => this.getAllowedGroupsByCharacter(_characterId)));
            allowedGroups.map(_arr => groups.merge(_arr));

            let groupsInfo = await Promise.all(groups.map(_groupId => this.get(_groupId).getInfo()));

            let prarr = [];
            for (let a = 0; a < groupsInfo.length; a++) {
                groupsInfo[a].id = groups[a];
                prarr.push(core.userController.getUserName(groupsInfo[a].owner));
            }

            let ownerNames = await Promise.all(prarr);
            for (let a = 0; a < ownerNames.length; a++) {
                groupsInfo[a].owner = ownerNames[a];
            }

            pr.resolve(groupsInfo);
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },

    // Allow get groups by
    // corporations
    // characters
    getAllowedGroupsByCharacter: async function (_characterId) {
        let pr = new CustomPromise();

        try {
            let corporationId = await core.charactersController.get(_characterId).getCorporationId();
            let allianceId = await core.charactersController.get(_characterId).getAllianceId();
            let groupsByAlliancePr = this.getGroupsByAlliance(allianceId);
            let groupsByCorporationPr = this.getGroupsByCorporation(corporationId);
            let groupsByCharacterPr = this.getGroupsByCharacter(_characterId);

            let groupsByAlliance = await groupsByAlliancePr;
            let groupsByCorporation = await groupsByCorporationPr;
            let groupsByCharacter = await groupsByCharacterPr;

            let out = groupsByCorporation.slice()
                .merge(groupsByCharacter)
                .merge(groupsByAlliance);

            pr.resolve(out);
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },

    getGroupsByCharacter: function (_characterId) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
            {name: "second", operator: "=", value: _characterId}
        ];

        core.dbController.linksTable.getByCondition(condition, ["first"]).then(function (_result) {
            pr.resolve(_result.map(_x => _x.first));
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },

    getGroupsByCorporation: function (_corporationId) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCorporation},
            {name: "second", operator: "=", value: _corporationId}
        ];

        core.dbController.linksTable.getByCondition(condition, ["first"]).then(function (_result) {
            pr.resolve(_result.map(_x => _x.first));
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    getGroupsByAlliance: function (_allianceId) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToAlliance},
            {name: "second", operator: "=", value: _allianceId}
        ];

        core.dbController.linksTable.getByCondition(condition, ["first"]).then(function (_result) {
            pr.resolve(_result.map(_x => _x.first));
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    /**
     * Этот метод должен вернуть список карт, которые доступны для пользователя
     *
     * по идее - надо пройтись по всем картам, которые есть
     * потом испросить для каждой карты группы
     * потом профильтровать для каждой группы персонажей пользователя
     * звучит как-то накладно
     *
     * ИЛИ быть умнее
     * найти все доступные для пользователя группы, и вернуть карты, которые для них соответствуют (Гениально!)
     * @param _userId
     */
    getAllowedMapsByUser: async function (_userId) {
        let pr = new CustomPromise();

        try {
            let groups = await this.getAllowedGroupListByOwner(_userId);

            /**
             * output of this operations is
             * @type {Array<Array<Number>>}
             */
            let mapsArr = await Promise.all(groups.map(_group => core.mapController.getMapsByGroup(_group.id)))

            let maps = [];
            mapsArr.map(_maps => maps.merge(_maps));

            let filteredMaps = maps.filter(_map => _map !== null);

            let outMaps = [];
            let filterObj = Object.create(null);

            for (let a = 0; a < filteredMaps.length; a++) {
                let mapId = filteredMaps[a].first;

                if(!filterObj[mapId]) {
                    filterObj[mapId] = true;
                    outMaps.push(mapId);
                }
            }

            pr.resolve(outMaps);
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },
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
    getAllowedCharactersForGroupByUser: async function (_groupId, _userId) {
        let pr = new CustomPromise();

        try {
            let userCharacters = await core.userController.getUserCharacters(_userId);
            let out = await this.getAllowedCharactersForGroup(_groupId, userCharacters);
            pr.resolve(out);
        } catch (_err) {
            pr.resolve(_err);
        }

        return pr.native;
    },

    /**
     * Этот метод вернет всех персонажей, которые удовлетворяют условиям группы т.е.:
     * - при этом, пользователь должен быть онлайн
     * - добавлены в список перснонажей
     * - находятся в корпорации, которая добавлена в список корпораций
     * - находятся в альянсе, который добавлен в список альянсов
     *
     * @param {string} _groupId
     * @returns {Promise<Array<string>>}
     */
    getAllAllowedCharactersForGroupByOnlineUser: async function (_groupId) {
        let pr = new CustomPromise();

        // todo - почему-то пользователей на онлайн я не проверяю
        let userCharacters = await core.charactersController.getAllCharactersByOnlineUser();

        try {
            let out = await this.getAllowedCharactersForGroup(_groupId, userCharacters);
            pr.resolve(out);
        } catch (_err) {
            pr.resolve(_err);
        }

        return pr.native;
    },

    /**
     * Этот метод профильтрует всех персонажей, которые туда будут переданы
     * Предполагается, что эти персонажи прикреплены к пользователю.
     * Соответственно здесь, будет проведена выборка из пресонажей, корпораций и альянсов, которые присоеденины к группе
     *
     * @param _groupId
     * @param _charactersIds
     * @returns {Promise<Array<string>>}
     * @private
     */
    getAllowedCharactersForGroup: async function (_groupId, _charactersIds) {
        let pr = new CustomPromise();

        // I don't like await style - because it very relax and comfort
        // and you can shot in self
        // but in then style code - you don't understand what's happens
        try {
            // May be, if it will very slowly work, then can optimize - get track and characterId both
            // instead getGroupCharacters
            // var userCharactersPr = core.userController.getUserCharacters(_userId);
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
            let out = characterIds.map((id, index) => ({id: characterIds[index], track: trackArr[index], name: namesArr[index]}));
            pr.resolve(out);
        } catch (_err) {
            pr.reject({
                sub: _err,
                message: "Error on load getAllowedCharactersForGroup"
            })
        }

        return pr.native;
    },
    getAllowedCharactersForGroups: async function (_groups) {
        let pr = new CustomPromise();

        try {
            // we need take all allowed characters in this game
            let characterIds = await core.charactersController.getAllCharacters();
            let arrCharacters = await Promise.all(_groups.map(_groupId => this.getAllowedCharactersForGroup(_groupId, characterIds)));
            let filteredCharactersObj = Object.create(null);
            let outCharacterIds = [];
            //todo необходимо убрать все пересечения
            for (let a = 0; a < arrCharacters.length; a++) {
                let characters = arrCharacters[a];

                for (let b = 0; b < characters.length; b++) {
                    let charInfo = characters[b];
                    if(!filteredCharactersObj[charInfo.id]) {
                        filteredCharactersObj[charInfo.id] = true;
                        outCharacterIds.push(charInfo);
                    }
                }

            }

            pr.resolve(outCharacterIds);
        } catch (_err) {
            pr.reject();
        }

        return pr.native;
    },

    getAllGroups: async function () {
        let pr = new CustomPromise();

        try {
            let groups = await core.groupsDB.all();

            pr.resolve(groups.map(_group => _group.id));
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },

    getAllowedCharactersForGroupByCorporations: async function (_groupId, _characterIds) {
        let pr = new CustomPromise();

        let corporationIdsPr = Promise.all(_characterIds.map(_characterId => core.charactersController.get(_characterId).getCorporationId()));
        let groupCorporationsPr = this.getGroupCorporations(_groupId);

        let corporationIds = await corporationIdsPr;
        let groupCorporations = await groupCorporationsPr;

        let out = [];
        for (let a = 0; a < corporationIds.length; a++) {
            if (corporationIds[a] !== -1 && groupCorporations.indexOf(corporationIds[a]) !== -1) {
                out.push(_characterIds[a])
            }
        }

        pr.resolve(out);

        return pr.native;
    },
    getAllowedCharactersForGroupByAlliances: async function (_groupId, _characterIds) {
        let pr = new CustomPromise();

        let allianceIdsPr = Promise.all(_characterIds.map(_characterId => core.charactersController.get(_characterId).getAllianceId()));
        let groupAlliancesPr = this.getGroupAlliances(_groupId);

        let allianceIds = await allianceIdsPr;
        let groupAlliances = await groupAlliancesPr;

        let out = [];
        for (let a = 0; a < allianceIds.length; a++) {
            if (allianceIds[a] !== -1 && groupAlliances.indexOf(allianceIds[a]) !== -1) {
                out.push(_characterIds[a])
            }
        }

        pr.resolve(out);

        return pr.native;
    },

    updateAllowedCharactersForGroup: async function (_userId, _groupId, _characters) {
        let pr = new CustomPromise();

        try {
            await Promise.all(_characters.map(_character => this.updateCharacterTrack(_groupId, _character.id, _character.track)));
            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },

    fastSearch: function (_options) {
        let match = _options.match;
        let type = _options.type;

        switch (type) {
            case "byUserGroups":
                break;
            case "byAll":
                break;
        }

    },
    getMapsWhereGroup: async function (_groupId) {
        let pr = new CustomPromise();

        var cond = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.mapToGroups},
            {name: "second", operator: "=", value: _groupId}
        ];

        try {
            let result = await core.dbController.linksTable.getByCondition(cond, ["first", "second"]);
            let maps = Promise.all(result.map(_data => core.dbController.mapsDB.get(_data.first, "name")));
            pr.resolve(maps);
        } catch (_err) {
            pr.reject();
        }

        return pr.native;
    },
    getCharacterTrack: function (_groupId, _characterId) {
        let pr = new CustomPromise();

        let condition = [
            {name: "groupId",operator: "=",value: _groupId},
            {name: "characterId",operator: "=",value: _characterId}
        ];

        core.dbController.groupToCharacterTable.getByCondition(condition, ["track"]).then(function (_result) {
            pr.resolve(_result.length === 1 ? _result[0].track : false);
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    removeCharacterFromTracking: async function (_groupId, _characterId) {
        let pr = new CustomPromise();

        try {
            var gtCondition = [{name: "characterId", operator: "=", value: _characterId}];
            await core.dbController.groupToCharacterTable.removeByCondition(gtCondition);
            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    removeCharactersFromTracking: async function (_groupId, _characterIds) {
        let pr = new CustomPromise();

        try {
            let gtCondition = [{name: "groupId", operator: "=", value: _groupId}];

            for (let a = 0; a < _characterIds.length; a++)
                gtCondition.push({name: "characterId", operator: "=", value: _characterIds[a]});

            await core.dbController.groupToCharacterTable.removeByCondition(gtCondition);
            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    removeGroupCharactersFromTracking: async function (_groupId) {
        let pr = new CustomPromise();

        try {
            let gtCondition = [{name: "groupId", operator: "=", value: _groupId}];
            await core.dbController.groupToCharacterTable.removeByCondition(gtCondition);
            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    getTrackedCharactersByGroup: function (_groupId) {
        let pr = new CustomPromise();

        let condition = [{name: "groupId",operator: "=",value: _groupId}];

        core.dbController.groupToCharacterTable.getByCondition(condition, ["characterId"]).then(function (_result) {
            pr.resolve(_result.map(_data => _data.characterId));
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    getGroupsByTrackedCharacterId:  async function (_characterId) {
        let pr = new CustomPromise();

        let condition = [{name: "characterId",operator: "=",value: _characterId}];

        try {
            let groups = await core.dbController.groupToCharacterTable.getByCondition(condition, ["groupId", "track"]);
            pr.resolve(groups);
        } catch (_err) {
            pr.reject(_err);
        }
        core.dbController.groupToCharacterTable.getByCondition(condition, ["groupId", "track"]).then(function (_result) {
            pr.resolve(_result.length === 1 ? _result[0].track : false);
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    updateCharacterTrack: async function (_groupId, _characterId, _track) {
        let pr = new CustomPromise();

        let condition = [
            {name: "groupId", operator: "=", value: _groupId},
            {name: "characterId", operator: "=", value: _characterId}
        ];

        try {
            let result = await core.dbController.groupToCharacterTable.getByCondition(condition, ["track"]);
            let isExist = result.length > 0;
            if (isExist) {
                await core.dbController.groupToCharacterTable.setByCondition(condition, {track: _track});
                await core.mapController.updateCharacterStatus(_groupId, _characterId, _track);
            } else if(!isExist && _track) {
                await core.dbController.groupToCharacterTable.add({
                    groupId: _groupId,
                    characterId: _characterId,
                    track: _track
                });
                await core.mapController.updateCharacterStatus(_groupId, _characterId, _track);
            }

            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    getGroupWithCharactersByUser: async function (_userId) {
        let pr = new CustomPromise();
        try {
            // Список персонажей пользователя
            let characterIds = await core.userController.getUserCharacters(_userId);

            // Получим список массивов, где есть данные о группе и отслеживании персонажа
            // Получаем Array<Array<{groupId, track, characterId}>>
            let arr = await Promise.all(characterIds.map(_characterId => this.getGroupsByTrackedCharacterId(_characterId)));

            // Разложим отслеживающихся персонажей по группам
            let filteredGroups = Object.create(null);
            for (let a = 0; a < arr.length; a++) {
                let characterId = characterIds[a];
                let groupsWithTrack = arr[a];

                for (let b = 0; b < groupsWithTrack.length; b++) {
                    if (groupsWithTrack[b].track) {
                        if (!filteredGroups[groupsWithTrack[b].groupId]) {
                            filteredGroups[groupsWithTrack[b].groupId] = []
                        }

                        filteredGroups[groupsWithTrack[b].groupId].push(characterId)
                    }
                }
            }

            pr.resolve(filteredGroups);
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;

    },
    _removeCharacters: function (_groupId) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type", operator: "=", value: DBController.linksTableTypes.groupToCharacter},
            {name: "first", operator: "=", value: _groupId}
        ];

        core.dbController.linksTable.removeByCondition(condition).then(function () {
            pr.resolve();
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    _removeCorporations: function (_corporationId) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type",operator: "=",value: DBController.linksTableTypes.groupToCorporation},
            {name: "first",operator: "=",value: _corporationId}
        ];

        core.dbController.linksTable.removeByCondition(condition).then(function () {
            pr.resolve();
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    _removeAlliances: function (_allianceId) {
        let pr = new CustomPromise();

        let condition = [
            {name: "type",operator: "=",value: DBController.linksTableTypes.groupToAlliance},
            {name: "first",operator: "=",value: _allianceId}
        ];

        core.dbController.linksTable.removeByCondition(condition).then(function () {
            pr.resolve();
        }.bind(this), function (_err) {
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
});


module.exports = GroupsController;