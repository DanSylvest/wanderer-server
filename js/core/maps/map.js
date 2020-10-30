/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Emitter                                = require("./../../env/tools/emitter");
var classCreator                           = require("./../../env/tools/class");
var extend                                 = require("./../../env/tools/extend");
var exist                                  = require("./../../env/tools/exist");
var print_f                                = require("./../../env/tools/print_f");
var CustomPromise                          = require("./../../env/promise");
var md5                                    = require("md5");
var Subscriber                             = require("./../../utils/subscriber");
var log                                    = require("./../../utils/log");
const { PerformanceObserver, performance } = require('perf_hooks');

var Map = classCreator("Map", Emitter, {
    constructor: function Map(_options) {
        // this.options = extend({
        //     // mapId: null
        // }, _options);
        this.options = Object.create(null);

        let __mapId = null;
        Object.defineProperty(this.options, "mapId", {
            get: function () {
                return __mapId;
            },
            set: function (_val) {
                if(_val === undefined)
                    debugger;

                __mapId = _val;
            }
        });

        this.options.mapId = _options.mapId;

        Emitter.prototype.constructor.call(this);

        this._charactersData = Object.create(null);

        this._systems = Object.create(null);
        this._charactersOnSystem = Object.create(null);
        this._links = Object.create(null);

        this._systemsSubscriber = null;
        this._linksSubscriber = null;

        this._notifySystems = false;
        this._notifyLinks = false;
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },

    init: async function () {
        var pr = new CustomPromise();

        // TODO - на старте системы, понятное дело, что никого не может быть на карте,
        // поэтому, нужно очистить связи персонажей с системами
        // this._observeCharacters();
        pr.resolve();

        return pr.native;
    },

    /**
     * Когда разрывается соединение, нам необходимо найти всех персонажей для пользователя, который отключился
     * и убрать их из отслеживания
     *
     * Все персонажи должны быть удалены из карт (где они показаны, что находятся)
     * @param _connectionId
     */
    connectionBreak: function (_connectionId) {
        this._systemsSubscriber && this._systemsSubscriber.removeSubscribersByConnection(_connectionId);
        this._linksSubscriber && this._linksSubscriber.removeSubscribersByConnection(_connectionId);
    },



    offlineCharacters: async function (_characterIds) {
        var pr = new CustomPromise();
        // Полагаю, что искать всех персонажей этого пользователя, которые попадают для карты, нет смысла - довольно накладно
        // Так что имеет смысл, просто взять всех персонажей и просто если они тут есть и трекаются, отключить от карты
        // Следовательно, если такой персонаж тут есть, необходимо: удалить его из системы
        // перестать отслеживать его онлайн и т.д.
        try {
            var prarr = [];

            for (var a = 0; a < _characterIds.length; a++) {
                var characterId = _characterIds[a];

                // А вот что, если персонаж еще не успел загрузиться?
                // Ведь, вот, ну наверняка такое может случится
                if (this._charactersData[characterId]) {
                    var charData = this._charactersData[characterId];

                    charData.onlineAttr.off(charData.onlineSubscribeId);

                    charData.locationAttr && charData.locationAttr.off(charData.locationSubscribeId);

                    delete this._charactersData[characterId];

                    var condition = [
                        {name: "mapId", operator: "=", value: this.options.mapId},
                        {name: "characterId", operator: "=", value: characterId},
                    ];

                    prarr.push(core.dbController.mapSystemToCharacterTable.removeByCondition(condition));

                    this._characterLeaveSystem(characterId, this._charactersOnSystem[characterId]);
                }
            }

            await Promise.all(prarr);
            pr.resolve();
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },


    linkRemove: async function (_linkId) {
        // todo - процес удаления линка может быть только один раз
        // поэтому его надо блокировать

        try {
            var condition = [
                {name: "mapId", operator: "=", value: this.options.mapId},
                {name: "id", operator: "=", value: _linkId},
            ]

            var info = await core.dbController.mapLinksTable.getByCondition(condition, core.dbController.mapLinksTable.attributes());

            // we need remove from this._links
            delete this._links[info[0].solarSystemSource + "_" + info[0].solarSystemTarget];
            delete this._links[info[0].solarSystemTarget + "_" + info[0].solarSystemSource];

            await core.dbController.mapLinksTable.removeByCondition(condition);

            if (this._notifyLinks) {
                this._linksSubscriber.notify({
                    type: "removed",
                    linkId: _linkId
                })
            }
        } catch (_err) {
            debugger;
        }
    },

    systemRemove: async function (_systemId) {
        try {
            // вот только надо ли?
            this._systems[_systemId] && this._systems[_systemId].loadPromise && this._systems[_systemId].loadPromise.reject();
            this._systems[_systemId] && (this._systems[_systemId].removing = true);

            var condition = [
                {name: "id", operator: "=", value: _systemId},
                {name: "mapId", operator: "=", value: this.options.mapId}
            ];
            await core.dbController.mapSystemsTable.setByCondition(condition, {visible: false});

            // теперь надо найти все линки связанные с этой системой и удалить их
            var lcondition = `"mapId"='${this.options.mapId}' AND ("solarSystemSource"='${_systemId}' OR "solarSystemTarget"='${_systemId}');`;
            var result = await core.dbController.mapLinksTable.getByCondition(lcondition, ["id"]);
            await Promise.all(result.map(_row => this.linkRemove(_row.id)));

            for(var characterId in this._charactersData) {
                if(this._charactersData[characterId].locationValue === _systemId){
                    this._charactersData[characterId].locationValue = null;
                }
            }

            if (this._notifySystems) {
                this._systemsSubscriber.notify({
                    type: "removed",
                    systemId: _systemId
                })
            }

            if(this._systems[_systemId] && this._systems[_systemId].removingTimerId !== -1)
                clearTimeout(this._systems[_systemId].removingTimerId);

            delete this._systems[_systemId];
        } catch (_err) {
            debugger;
        }
    },

    addCharactersToObserve: function (_characterIds) {
        _characterIds.map(_characterId => this._startObserverCharacter(_characterId));
    },

    _createSystemObject: function (_systemId) {
        if(!this._systems[_systemId]) {
            this._systems[_systemId] = {
                onlineCharacters: []
            }
        }
    },
    _startObserverCharacter: function (_characterId) {
        if (this._charactersData[_characterId]) {
            // we don't need to subscribe twice
            // but may be show alert?
            // i don't know
            return;
        }

        log(log.INFO, "Character [%s] was added to observe in map [%s]", _characterId, this.options.mapId);

        var onlineAttr = core.charactersController.get(_characterId).get("online");
        var onlineSubscribeId = onlineAttr.on("change", this._onOnlineChange.bind(this, _characterId));
        this._charactersData[_characterId] = {
            onlineSubscribeId: onlineSubscribeId,
            onlineAttr: onlineAttr,
            onlineValue: false // default state of online must be a false
        }

        // now we can't get online state, and we need wait _onOnlineChange
    },

    /**
     * It will called when character online state is changed
     *
     * @param _characterId
     * @param _isOnline
     * @private
     */
    _onOnlineChange: function (_characterId, _isOnline) {
        var characterData = this._charactersData[_characterId];

        // when state change from false to true
        // we need start observer location of character
        if (_isOnline && !characterData.onlineValue) {
            var locationAttr = core.charactersController.get(_characterId).get("location");
            var locationSubscribeId = locationAttr.on("change", this._onLocationChange.bind(this, _characterId));
            characterData.locationAttr = locationAttr;
            characterData.locationSubscribeId = locationSubscribeId;

            var shipAttr = core.charactersController.get(_characterId).get("ship");
            var shipSubscribeId = shipAttr.on("change", this._onShipChange.bind(this, _characterId));
            characterData.shipAttr = shipAttr;
            characterData.shipSubscribeId = shipSubscribeId;

            characterData.locationValue = null; // ?? Что это за странная фигня. Если разберусь почему надо описать
            characterData.onlineValue = true;
        }

        // when state change from true to false
        // we need off subscribe from character
        else if (!_isOnline && characterData.onlineValue) {
            if (characterData.locationValue !== null) {
                characterData.shipAttr.off(characterData.shipSubscribeId);
                delete characterData.shipAttr;
                delete characterData.shipSubscribeId;

                characterData.locationAttr.off(characterData.locationSubscribeId);
                delete characterData.locationAttr;
                delete characterData.locationSubscribeId;
                delete characterData.locationValue;
                characterData.onlineValue = false
            }

            this._characterLeaveSystem(_characterId, this._charactersOnSystem[_characterId]);
        }
    },

    /**
     * It will called when character location state is changed
     * Location - it is solar system id
     *
     * @param _characterId
     * @param _location
     * @private
     */
    _onLocationChange: function (_characterId, _location) {
        var characterData = this._charactersData[_characterId];
        var _location = _location.toString();

        if(this._systems[_location] && this._systems[_location].removing) {
            if(this._systems[_location].removingTimerId !== -1)
                clearTimeout(this._systems[_location].removingTimerId);

            this._systems[_location].removingTimerId = setTimeout(this._onLocationChange.bind(this, _characterId, _location), 1);
            return;
        }

        // Когда персонаж только начал отслеживаться на карте
        if (characterData.locationValue === null && _location) {
            // надо проверить, есть ли такая система на карте
            // если такой системы нет, то надо бы ее добавить
            // линк, создавать нет необходимости
            // надо добавить персонажа в систему
            characterData.locationValue = _location;

            this._characterEnterToSystem(_characterId, _location);
        }

        // Когда персонаж сделал переход из одной системы в другую
        else if (characterData.locationValue && _location && characterData.locationValue !== _location) {
            // надо проверить, есть ли такая система на карте
            // если такой системы нет, то надо бы ее добавить
            // надо добавить персонажа в систему _location
            // надо удалить персонажа из системы characterData.locationValue
            // надо проверить, существует ли уже линк между системами
            // если существует, то инкрементировать счетчик прохода
            // если не существует, то следует создать

            var oldSystem = characterData.locationValue;
            characterData.locationValue = _location;

            this._characterMoveToSystem(_characterId, oldSystem, _location);
        }
    },

    _onShipChange: function (_characterId, _shipTypeId) {
        // todo Пока ничего делать не надо, но в будущем надо отправлять уведомление, что тип шипа поменялся
    },

    /**
     * Если такой системы на карте нет, то создаст и оповестит,
     * Если карта есть, то ничего не произойдет
     *
     * @param _oldSystem
     * @param _systemId
     * @returns {Promise<void>}
     * @private
     */
    _addSystem: async function (_oldSystem, _systemId) {
        this._createSystemObject(_systemId);
        if (!this._systems[_systemId].loadPromise) {
            this._systems[_systemId].loadPromise = new CustomPromise();

            try {
                var condition = [
                    {name: "id", operator: "=", value: _systemId},
                    {name: "mapId", operator: "=", value: this.options.mapId}
                ];

                var result = await core.dbController.mapSystemsTable.getByCondition(condition, ["visible"]);

                // В этом случае мы смотрим существует ли такая система, и если она "удалена"
                // то делаем ее видимой
                // В противном случае ничего не делаем
                if (result.length > 0) {
                    if (!result[0].visible) {
                        let pos = await this.findPosition(_oldSystem, _systemId);
                        await core.dbController.mapSystemsTable.setByCondition(condition, {visible: true, position: pos});

                        if (this._notifySystems) {
                            let info = await this.getSystemInfo(_systemId);
                            this._systemsSubscriber.notify({
                                type: "add",
                                systemInfo: info
                            });
                        }``
                    }

                    this._systems[_systemId].loadPromise.resolve();

                    // В этом случае мы добавляем новую систему
                } else {
                    var solarSystemInfo = await core.sdeController.getSolarSystemInfo(_systemId);

                    if (solarSystemInfo === null) {
                        // это могло произойти если в базе данных евки, не нашлась эта система
                        // (возможно надо новый дамп базы загрузить)
                        debugger;
                    }

                    var pos = await this.findPosition(_oldSystem, _systemId);

                    await core.dbController.mapSystemsTable.add({
                        mapId: this.options.mapId,
                        id: _systemId,
                        name: solarSystemInfo.solarSystemName,
                        position: pos
                    });

                    this._systems[_systemId].loadPromise.resolve();

                    if (this._notifySystems) {
                        let info = await this.getSystemInfo(_systemId);
                        this._systemsSubscriber.notify({
                            type: "add",
                            systemInfo: info
                        })
                    }
                }
            } catch (_err) {
                debugger;
                this._systems[_systemId].loadPromise.reject(_err);
            }
        }

        return this._systems[_systemId].loadPromise.native;
    },

    /**
     * Добавит линк, если его нет
     * @param _sourceSystemId
     * @param _targetSystemId
     * @returns {Promise<any>}
     * @private
     */
    _addLink: async function (_sourceSystemId, _targetSystemId) {
        // Получим промис, который отвечает за то, что уже кто-то загружает этот линк из базы
        var loadingPromise = this._links[_sourceSystemId + "_" + _targetSystemId] || this._links[_targetSystemId + "_" + _sourceSystemId];

        if (!loadingPromise) {
            loadingPromise = new CustomPromise();
            this._links[_sourceSystemId + "_" + _targetSystemId] = loadingPromise;

            var link = await this._getLink();
            if (!link) {
                var id = md5(config.app.solt + "_" + +new Date);

                await core.dbController.mapLinksTable.add({
                    id: id,
                    mapId: this.options.mapId,
                    solarSystemSource: _sourceSystemId,
                    solarSystemTarget: _targetSystemId,
                });

                if (this._notifyLinks) {
                    this._linksSubscriber.notify({
                        type: "add",
                        linkId: id
                    })
                }

                loadingPromise.resolve();
            }
        }

        return loadingPromise.native;
    },
    _getLink: async function (_sourceSystemId, _targetSystemId) {
        var pr = new CustomPromise();

        var condition = `
            "mapId"='${this.options.mapId}' 
            AND 
            (
                ("solarSystemSource"='${_sourceSystemId}' AND "solarSystemTarget"='${_targetSystemId}')
                OR
                ("solarSystemSource"='${_targetSystemId}' AND "solarSystemTarget"='${_sourceSystemId}')
            );`;

        var attrs = core.dbController.mapLinksTable.attributes();
        try {
            var result = await core.dbController.mapLinksTable.getByCondition(condition, attrs);
            pr.resolve(result.length > 0 ? result[0] : null);
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    _linkPassage: async function (_sourceSystemId, _targetSystemId, _characterId) {
        var pr = new CustomPromise();

        try {
            // Итак, теперь, если линка нет, то все при проходе будут вот тут соять и ждать
            await this._addLink(_sourceSystemId, _targetSystemId);

            // А здесь нам уже все-равно, т.к. полюбому линк будет добавлен
            // Так что со спокойной душой инкрементируем счетчик проходов
            // Правда возможно это будет работать не очень быстро, т.к. при добавлении, будет давара делаться гет линк
            var link = await this._getLink(_sourceSystemId, _targetSystemId);
            var condition = [
                {name: "id", operator: "=", "value": link.id}
            ];
            await core.dbController.mapLinksTable.setByCondition(condition, {
                countOfPassage: ++link.countOfPassage
            });

            //TODO А после этого, нужно отправить оповещение в гуй, что линк id был проинкрементирован

            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },

    _characterJoinToSystem: async function (_characterId, _systemId) {
        var pr = new CustomPromise();

        var query = `INSERT INTO public.${core.dbController.mapSystemToCharacterTable.name()}
            ("mapId", "systemId", "characterId")
        SELECT '${this.options.mapId}', '${_systemId}', '${_characterId}'
        WHERE
            NOT EXISTS (
                SELECT "mapId" FROM public.${core.dbController.mapSystemToCharacterTable.name()} WHERE "mapId" = '${this.options.mapId}' AND "systemId" = '${_systemId}' AND "characterId" = '${_characterId}'
            );`;

        try {
            this._createSystemObject(_systemId);
            await core.dbController.db.custom(query);
            this._systems[_systemId].onlineCharacters.push(_characterId);
            this._charactersOnSystem[_characterId] = _systemId;

            if (this._notifySystems) {
                this._systemsSubscriber.notify({
                    type: "systemUpdatedList",
                    list: [
                        {type: "onlineUpdate", systemId: _systemId, onlineCount: this._systems[_systemId].onlineCharacters.length},
                        {type: "userJoin", systemId: _systemId, characterId: _characterId},
                    ]
                });
            }

            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    _characterLeaveSystem: async function (_characterId, _systemId) {
        var pr = new CustomPromise();

        var condition = [
            {name: "mapId", operator: "=", value: this.options.mapId},
            {name: "systemId", operator: "=", value: _systemId},
            {name: "characterId", operator: "=", value: _characterId},
        ];

        try {
            await core.dbController.mapSystemToCharacterTable.removeByCondition(condition)
            this._systems[_systemId].onlineCharacters.removeByIndex(this._systems[_systemId].onlineCharacters.indexOf(_characterId));
            delete this._charactersOnSystem[_characterId];

            this._systemsSubscriber.notify({
                type: "systemUpdatedList",
                list: [
                    {type: "onlineUpdate", systemId: _systemId, onlineCount: this._systems[_systemId].onlineCharacters.length},
                    {type: "userLeave", systemId: _systemId, characterId: _characterId},
                ]
            });

            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },
    _characterEnterToSystem: async function (_characterId, _systemId) {
        var pr = new CustomPromise();

        try {
            var solarSystemInfo = await core.sdeController.getSolarSystemInfo(_systemId);
            var systemClass = await core.sdeController.getSystemClass(solarSystemInfo.regionID, solarSystemInfo.constellationID, _systemId);
            let isExists = await this.systemExists(_systemId);

            var isEmpire = systemClass === 7 || systemClass === 8 || systemClass === 9;

            if(isExists || !isEmpire) {
                // Если такой системы на карте нет, то создаст и оповестит
                // Если есть, то ничего не будет делать
                await this._addSystem(null, _systemId);
                await this._characterJoinToSystem(_characterId, _systemId);
            }

            pr.resolve();
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },
    _characterMoveToSystem: async function (_characterId, _oldSystem, _newSystem) {
        var pr = new CustomPromise();

        try {
            // проверить связанна ли система гейтами
            // Если система слинкована гейтами, то не добавлять ее
            var isJump = await core.sdeController.checkSystemJump(_oldSystem, _newSystem);

            if(!isJump) {
                var isSystemExists = await this.systemExists(_oldSystem);

                /**
                 * Если предыдущая система существует в базе, то
                 * добавим новую систему
                 * покинем старую систему
                 * зайдем в новую систему
                 * добавим связь
                 *
                 * в противном случае
                 * добавим старую систему
                 * добавим новую систему
                 * зайдем в новую систему
                 * добавим связь
                 *
                 *
                 * todo сделать проверку на Jita. В жите не бывает вормхолов
                 */
                if(isSystemExists) {
                    await this._addSystem(_oldSystem, _newSystem);
                    await this._characterLeaveSystem(_characterId, _oldSystem);
                    await this._characterJoinToSystem(_characterId, _newSystem);
                    await this._linkPassage(_oldSystem, _newSystem, _characterId);
                } else {
                    await this._addSystem(null, _oldSystem);
                    await this._addSystem(_oldSystem, _newSystem);
                    await this._characterJoinToSystem(_characterId, _newSystem);
                    await this._linkPassage(_oldSystem, _newSystem, _characterId);
                }
            }

            pr.resolve();
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },

    findPosition: async function (_oldSystemId, _systemId) {
        var pr = new CustomPromise();

        try {

            var newPosition = {x: 0, y: 0};

            if(_oldSystemId !== null) {

                var conditionOld = [
                    {name: "mapId", operator: "=", value: this.options.mapId},
                    {name: "id", operator: "=", value: _oldSystemId},
                    {name: "visible", operator: "=", value: true},
                ];

                var oldSystemPositionResult = await core.dbController.mapSystemsTable.getByCondition(conditionOld, ["position"]);

                if (oldSystemPositionResult.length > 0) {
                    var oldPosition = oldSystemPositionResult[0].position;
                    newPosition = {x: oldPosition.x + 200, y: oldPosition.y};
                }
            }

            pr.resolve(newPosition);

        } catch (_err) {
            pr.reject(_err);
        }


        return pr.native;
    },

    updateSystem: async function (_systemId, _data) {
        var pr = new CustomPromise();

        try {

            var condition = [
                {name: "id", operator: "=", value: _systemId},
                {name: "mapId", operator: "=", value: this.options.mapId},
            ];

            var attrs = core.dbController.mapSystemsTable.attributes();

            for(var attr in _data) {
                if(!attrs.indexOf(attr)) {
                    throw "Error: you try update not exist attribute";
                }
            }

            await core.dbController.mapSystemsTable.setByCondition(condition, _data);

            if (this._notifySystems) {
                this._systemsSubscriber.notify({
                    type: "systemUpdated",
                    systemId: _systemId,
                    data: _data
                });
            }

            pr.resolve();
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },


    updateLink: async function (_linkId, _data) {
        var pr = new CustomPromise();

        try {
            var condition = [
                {name: "id", operator: "=", value: _linkId},
                {name: "mapId", operator: "=", value: this.options.mapId},
            ];

            var attrs = core.dbController.mapLinksTable.attributes();

            for(var attr in _data) {
                if(!attrs.indexOf(attr)) {
                    throw "Error: you try update not exist attribute";
                }
            }

            await core.dbController.mapLinksTable.setByCondition(condition, _data);

            if (this._notifyLinks) {
                this._linksSubscriber.notify({
                    type: "linkUpdated",
                    linkId: _linkId,
                    data: _data
                });
            }

            pr.resolve();
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },

    updateSystemsPosition: async function (_systemsPosition) {
        var pr = new CustomPromise();

        try {

            var prarr = [];
            for (var a = 0; a < _systemsPosition.length; a++) {
                var systemPosition = _systemsPosition[a];

                var condition = [
                    {name: "id", operator: "=", value: systemPosition.id},
                    {name: "mapId", operator: "=", value: this.options.mapId},
                ];

                prarr.push(core.dbController.mapSystemsTable.setByCondition(condition, {
                    position: {
                        x: systemPosition.x,
                        y: systemPosition.y
                    }
                }));
            }

            if (this._notifySystems) {
                this._systemsSubscriber.notify({
                    type: "updatedSystemsPosition",
                    systemsPosition: _systemsPosition
                });
            }

            await Promise.all(prarr);
            pr.resolve();
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },

    getSystemInfo: async function (_systemId) {
        var pr = new CustomPromise();

        this._createSystemObject(_systemId);

        try {
            var condition = [
                {name: "id", operator: "=", value: _systemId},
                {name: "mapId", operator: "=", value: this.options.mapId}
            ]

            var info = await core.dbController.mapSystemsTable.getByCondition(condition, core.dbController.mapSystemsTable.attributes());

            // TODO may be it not better way
            // but now i will do so
            var solarSystemInfo = await core.sdeController.getSolarSystemInfo(_systemId);
            var constellationInfoPr = core.sdeController.getConstellationInfo(solarSystemInfo.constellationID);
            var regionInfoPr = core.sdeController.getRegionInfo(solarSystemInfo.regionID);
            var wormholeClassPr = core.sdeController.getSystemClass(solarSystemInfo.regionID, solarSystemInfo.constellationID, _systemId);
            var additionalSystemInfoPr = core.mdController.getCompiledInfo(_systemId);

            var constellationInfo = await constellationInfoPr;
            var regionInfo = await regionInfoPr;
            var wormholeClass = await wormholeClassPr;
            var additionalSystemInfo = await additionalSystemInfoPr;

            var systemTypeInfo = core.fdController.wormholeClassesInfo[wormholeClass];

            if(solarSystemInfo.security === -0.99)
                solarSystemInfo.security = -1.0;

            solarSystemInfo.security = solarSystemInfo.security.toFixed(1);

            var typeName = systemTypeInfo.name;
            switch (systemTypeInfo.type) {
                case 0:
                case 1:
                case 2:
                    typeName = solarSystemInfo.security.toString();
                    break;
            }

            var systemData = {
                typeName: typeName,
                isShattered: !!core.fdController.wormholeClassesInfo[solarSystemInfo.constellationID]
            }

            if(exist(additionalSystemInfo) && exist(additionalSystemInfo.effect)) {
                systemData.effectType = core.fdController.effectNames[additionalSystemInfo.effect];
                systemData.effectName = additionalSystemInfo.effect;
            }

            if(exist(additionalSystemInfo) && exist(additionalSystemInfo.statics)) {
                systemData.statics = additionalSystemInfo.statics;
            }

            var out = extend(extend({}, info[0]), {
                systemClass: wormholeClass,
                security: solarSystemInfo.security,
                constellationName: constellationInfo.constellationName,
                regionName: regionInfo.regionName,
                systemType: systemTypeInfo.type,
                systemData: systemData,
                onlineCount: this._systems[_systemId].onlineCharacters.length,
                onlineCharacters: this._systems[_systemId].onlineCharacters
            })

            pr.resolve(out);
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },

    getLinkInfo: async function (_linkId) {
        var pr = new CustomPromise();

        try {
            var condition = [
                {name: "id", operator: "=", value: _linkId},
                {name: "mapId", operator: "=", value: this.options.mapId}
            ]

            var info = await core.dbController.mapLinksTable.getByCondition(condition, core.dbController.mapLinksTable.attributes());

            pr.resolve(info[0]);
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },

    getSystems: async function () {
        var pr = new CustomPromise();

        try {
            var condition = [
                {name: "mapId", operator: "=", value: this.options.mapId},
                {name: "visible", operator: "=", value: true},
            ];

            var start = performance.now();
            //=============================
            var result = await core.dbController.mapSystemsTable.getByCondition(condition, ["id"]);
            var resultArr = await Promise.all(result.map(_system => this.getSystemInfo(_system.id)));
            // debugger;

            //=============================
            console.log("======== PERFORMANCE =========");
            console.log(performance.now() - start);
            console.log("======== PERFORMANCE END =========");

            pr.resolve(resultArr);
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },

    getLinks: async function () {
        var pr = new CustomPromise();

        try {
            var condition = [
                {name: "mapId", operator: "=", value: this.options.mapId}
            ];

            var result = await core.dbController.mapLinksTable.getByCondition(condition, ["id"]);

            var out = result.map(_item => _item.id);

            pr.resolve(out);
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },

    systemExists: async function (_systemId) {
        var pr = new CustomPromise();

        try {
            var condition = [
                {name: "mapId", operator: "=", value: this.options.mapId},
                {name: "id", operator: "=", value: _systemId},
            ];

            var result = await core.dbController.mapSystemsTable.getByCondition(condition, ["id"]);

            pr.resolve(result.length > 0);
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },

    isObservingCharacter: function (_characterId) {
        return !!this._charactersData[_characterId];
    },

    // ============================
    //  SUBSCRIPTIONS METHODS
    // ============================
    _createSystemsSubscriber: function () {
        var pr = new CustomPromise();

        if (!this._systemsSubscriber) {
            this._systemsSubscriber = new Subscriber({
                responseCommand: "responseEveMapSystems",
                onStart: function () {
                    this._notifySystems = true;
                }.bind(this),
                onStop: function () {
                    this._notifySystems = false;
                }.bind(this)
            });

            pr.resolve();
        } else {
            pr.resolve();
        }

        return pr.native;
    },

    _createLinksSubscriber: function () {
        var pr = new CustomPromise();

        if (!this._linksSubscriber) {
            this._linksSubscriber = new Subscriber({
                responseCommand: "responseEveMapLinks",
                onStart: function () {
                    this._notifyLinks = true;
                }.bind(this),
                onStop: function () {
                    this._notifyLinks = false;
                }.bind(this)
            });

            pr.resolve();
        } else {
            pr.resolve();
        }

        return pr.native;
    },

    subscribeSystems: function (_connectionId, _responseId) {
        this._createSystemsSubscriber().then(function () {
            this._systemsSubscriber.addSubscriber(_connectionId, _responseId);
        }.bind(this), function () {
            // do nothing
        }.bind(this));
    },
    unsubscribeSystems: function (_connectionId, _responseId) {
        if (this._systemsSubscriber) {
            this._systemsSubscriber.removeSubscriber(_connectionId, _responseId);
        }
    },

    subscribeLinks: function (_connectionId, _responseId) {
        this._createLinksSubscriber().then(function () {
            this._linksSubscriber.addSubscriber(_connectionId, _responseId);
        }.bind(this), function () {
            // do nothing
        }.bind(this));
    },
    unsubscribeLinks: function (_connectionId, _responseId) {
        if (this._linksSubscriber) {
            this._linksSubscriber.removeSubscriber(_connectionId, _responseId);
        }
    },

});

module.exports = Map;