/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */


const  Emitter        = require("./../../env/tools/emitter");
const classCreator    = require("./../../env/tools/class");
const exist           = require("./../../env/tools/exist");
const CustomPromise   = require("./../../env/promise");
const md5             = require("md5");
const Subscriber      = require("./../../utils/subscriber");
const counterLog      = require("./../../utils/counterLog");
// const { performance } = require('perf_hooks');
const Character       = require("./map/character");
const MapSolarSystem  = require("./map/solarSystem.js");

const Map = classCreator("Map", Emitter, {
    constructor (_options) {
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

        this.characters = Object.create(null);

        this._systems = Object.create(null);
        this._charactersOnSystem = Object.create(null);
        this._links = Object.create(null);

        this._systemsSubscriber = null;
        this._linksSubscriber = null;

        this._notifySystems = false;
        this._notifyLinks = false;
    },
    destructor () {
        Emitter.prototype.destructor.call(this);
    },

    async init () {

    },

    deinit () {
        for(let systemId in this._systems) {
            this._systems[systemId].destructor();
        }

        for(let linkId in this._links) {
            this._links[linkId].cancel();
        }

        for(let characterId in this.characters) {
            this.characters[characterId].destructor();
        }

        if(this._existenceSubscriber) {
            this._existenceSubscriber.notify(false);
            this._existenceSubscriber.destructor();
            this._systemsSubscriber = null;
        }

        if(this._systemsSubscriber) {
            this._systemsSubscriber.destructor();
            this._systemsSubscriber = null;
        }

        if(this._linksSubscriber) {
            this._linksSubscriber.destructor();
            this._linksSubscriber = null;
        }

        this.options = Object.create(null);
        this.characters = Object.create(null);
        this._systems = Object.create(null);
        this._charactersOnSystem = Object.create(null);
        this._links = Object.create(null);
        this._notifySystems = false;
        this._notifyLinks = false;
    },
    /**
     * Когда разрывается соединение, нам необходимо найти всех персонажей для пользователя, который отключился
     * и убрать их из отслеживания
     *
     * Все персонажи должны быть удалены из карт (где они показаны, что находятся)
     * @param _connectionId
     */
    connectionBreak (_connectionId) {
        this._systemsSubscriber && this._systemsSubscriber.removeSubscribersByConnection(_connectionId);
        this._linksSubscriber && this._linksSubscriber.removeSubscribersByConnection(_connectionId);
    },


    async linkRemove (_linkId) {
        // todo - процес удаления линка может быть только один раз
        // поэтому его надо блокировать

        let condition = [
            {name: "mapId", operator: "=", value: this.options.mapId},
            {name: "id", operator: "=", value: _linkId},
        ]

        let info = await core.dbController.mapLinksTable.getByCondition(condition, core.dbController.mapLinksTable.attributes());

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
    },

    async systemRemove (_systemId) {
        this._systems[_systemId].update(false);

        let lcondition = {
            operator: "AND",
            left: {name: "mapId", operator: "=", value: this.options.mapId},
            right: {
                operator: "OR",
                left: {name: "solarSystemSource", operator: "=", value: _systemId},
                right: {name: "solarSystemTarget", operator: "=", value: _systemId},
            }
        }
        let result = await core.dbController.mapLinksTable.getByCondition(lcondition, ["id"]);
        await Promise.all(result.map(_row => this.linkRemove(_row.id)));

        for(let characterId in this.characters) {
            if(this.characters[characterId].currentLocation() === _systemId) {
                this.characters[characterId].clearCurrentLocation();
            }
        }

        if (this._notifySystems && this._systemsSubscriber) {
            this._systemsSubscriber.notify({
                type: "removed",
                systemId: _systemId
            })
        }

        delete this._systems[_systemId];
    },

    addCharactersToObserve (_characterIds) {
        _characterIds.map(_characterId => this._startObserverCharacter(_characterId));
    },
    removeCharactersFromObserve (_characterIds) {
        _characterIds.map(characterId => this.characters[characterId] && this.characters[characterId].startDropTimer())
    },

    _createSystemObject (_systemId) {
        if(!exist(this._systems[_systemId])) {
            this._systems[_systemId] = new MapSolarSystem(this.options.mapId, _systemId);
        }
    },
    _startObserverCharacter (characterId) {
        if(!this.characters[characterId]) {
            this.characters[characterId] = new Character(characterId);
            this.characters[characterId].on("leaveSystem", this._onCharacterLeaveSystem.bind(this, characterId));
            this.characters[characterId].on("enterInSystem", this._onCharacterEnterInSystem.bind(this, characterId));
            this.characters[characterId].on("moveToSystem", this._onCharacterMoveToSystem.bind(this, characterId));
            this.characters[characterId].on("drop", this._onCharacterDrop.bind(this, characterId));
            this.characters[characterId].init();
        } else {
            this.characters[characterId].cancelDropTimer();
        }
    },


    /**
     * NEW PART
     * =================================
     */


    async _onCharacterLeaveSystem (characterId) {
        await this._characterLeaveSystem(characterId, this._charactersOnSystem[characterId]);
    },
    async _onCharacterEnterInSystem (characterId, location) {
        await this._characterEnterToSystem(characterId, location);
    },
    async _onCharacterMoveToSystem (characterId, oldSystem, location) {
        await this._characterMoveToSystem(characterId, oldSystem, location);
    },
    async _onCharacterDrop (characterId) {
        let isOnline = this.characters[characterId].isOnline();
        this.characters[characterId].destructor();
        delete this.characters[characterId];
        if(isOnline) {
            await this._characterLeaveSystem(characterId, this._charactersOnSystem[characterId]);
        }
    },
    async _notifySystemAdd (_systemId) {
        if (this._notifySystems && this._systemsSubscriber) {
            let info = await this.getSystemInfo(_systemId);
            this._systemsSubscriber.notify({
                type: "add",
                systemInfo: info
            });
        }
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
    async _addSystem (_oldSystem, _systemId) {
        this._createSystemObject(_systemId);
        let solarSystem = this._systems[_systemId];

        let result = await solarSystem.isSystemExistsAndVisible();
        if(result.exists && result.visible) {
            // do nothing
            solarSystem.resolve();
        }
        else if(result.exists && !result.visible) {
            let pos = await this.findPosition(_oldSystem, _systemId);
            await solarSystem.update(true, pos);
            solarSystem.resolve();

            await this._notifySystemAdd(_systemId);
        }
        else if (!result.exists) {
            let solarSystemInfo = await core.sdeController.getSolarSystemInfo(_systemId);
            if (solarSystemInfo === null) {
                // это могло произойти если в базе данных евки, не нашлась эта система
                // (возможно надо новый дамп базы загрузить)
                debugger;
            }

            let pos = await this.findPosition(_oldSystem, _systemId);
            await solarSystem.create(solarSystemInfo.solarSystemName, pos);
            solarSystem.resolve();

            await this._notifySystemAdd(_systemId);
        }

        return solarSystem.loadPromise();
    },

    /**
     * Добавит линк, если его нет
     * @param _sourceSystemId
     * @param _targetSystemId
     * @returns {Promise<any>}
     * @private
     */
    async _addLink (_sourceSystemId, _targetSystemId) {
        // Получим промис, который отвечает за то, что уже кто-то загружает этот линк из базы
        let loadingPromise = this._links[_sourceSystemId + "_" + _targetSystemId] || this._links[_targetSystemId + "_" + _sourceSystemId];

        if (!loadingPromise) {
            loadingPromise = new CustomPromise();
            this._links[_sourceSystemId + "_" + _targetSystemId] = loadingPromise;

            let link = await this._getLink();
            if (!link) {
                let id = md5(config.app.solt + "_" + +new Date);

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
    async _getLink (_sourceSystemId, _targetSystemId) {
        let condition = `
            "mapId"='${this.options.mapId}' 
            AND 
            (
                ("solarSystemSource"='${_sourceSystemId}' AND "solarSystemTarget"='${_targetSystemId}')
                OR
                ("solarSystemSource"='${_targetSystemId}' AND "solarSystemTarget"='${_sourceSystemId}')
            );`;

        let attrs = core.dbController.mapLinksTable.attributes();

        let result = await core.dbController.mapLinksTable.getByCondition(condition, attrs);
        return result.length > 0 ? result[0] : null;
    },
    async _linkPassage (_sourceSystemId, _targetSystemId, _characterId) {
        // Итак, теперь, если линка нет, то все при проходе будут вот тут соять и ждать
        await this._addLink(_sourceSystemId, _targetSystemId);

        // А здесь нам уже все-равно, т.к. полюбому линк будет добавлен
        // Так что со спокойной душой инкрементируем счетчик проходов
        // Правда возможно это будет работать не очень быстро, т.к. при добавлении, будет давара делаться гет линк
        let link = await this._getLink(_sourceSystemId, _targetSystemId);
        let condition = [
            {name: "id", operator: "=", "value": link.id}
        ];
        await core.dbController.mapLinksTable.setByCondition(condition, {
            countOfPassage: ++link.countOfPassage
        });

        //TODO А после этого, нужно отправить оповещение в гуй, что линк id был проинкрементирован
    },

    async _characterJoinToSystem (_characterId, _systemId) {
        let query = `INSERT INTO public.${core.dbController.mapSystemToCharacterTable.name()}
            ("mapId", "systemId", "characterId")
        SELECT '${this.options.mapId}', '${_systemId}', '${_characterId}'
        WHERE
            NOT EXISTS (
                SELECT "mapId" FROM public.${core.dbController.mapSystemToCharacterTable.name()} WHERE "mapId" = '${this.options.mapId}' AND "systemId" = '${_systemId}' AND "characterId" = '${_characterId}'
            );`;

        counterLog("SQL", query);
        this._createSystemObject(_systemId);
        await core.dbController.db.custom(query);
        this._systems[_systemId].onlineCharacters.push(_characterId);
        this._charactersOnSystem[_characterId] = _systemId;

        if (this._notifySystems && this._systemsSubscriber) {
            this._systemsSubscriber.notify({
                type: "systemUpdatedList",
                list: [
                    {type: "onlineUpdate", systemId: _systemId, onlineCount: this._systems[_systemId].onlineCharacters.length},
                    {type: "userJoin", systemId: _systemId, characterId: _characterId},
                ]
            });
        }
    },
    async _characterLeaveSystem (_characterId, _systemId) {
        let condition = [
            {name: "mapId", operator: "=", value: this.options.mapId},
            {name: "systemId", operator: "=", value: _systemId},
            {name: "characterId", operator: "=", value: _characterId},
        ];

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
    },
    async _characterEnterToSystem (_characterId, _systemId) {
        let solarSystemInfo = await core.sdeController.getSolarSystemInfo(_systemId);
        let systemClass = await core.sdeController.getSystemClass(solarSystemInfo.regionID, solarSystemInfo.constellationID, _systemId);
        let isExists = await this.systemExists(_systemId);

        let isEmpire = systemClass === 7 || systemClass === 8 || systemClass === 9;

        if(isExists || !isEmpire) {
            // Если такой системы на карте нет, то создаст и оповестит
            // Если есть, то ничего не будет делать
            await this._addSystem(null, _systemId);
            await this._characterJoinToSystem(_characterId, _systemId);
        }
    },
    async _characterMoveToSystem (_characterId, _oldSystem, _newSystem) {
        // проверить связанна ли система гейтами
        // Если система слинкована гейтами, то не добавлять ее
        let isJump = await core.sdeController.checkSystemJump(_oldSystem, _newSystem);

        if (!isJump) {
            let isSystemExists = await this.systemExists(_oldSystem);

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
            if (isSystemExists) {
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
        } else {
            let isDestSystemExists = await this.systemExists(_newSystem);
            let isOldSystemExists = await this.systemExists(_oldSystem);

            if (isOldSystemExists)
                await this._characterLeaveSystem(_characterId, _oldSystem);

            if (isDestSystemExists) {
                await this._addSystem(_oldSystem, _newSystem);
                await this._characterJoinToSystem(_characterId, _newSystem);
            }
        }
    },

    async findPosition (_oldSystemId, _systemId) {
        let newPosition = {x: 0, y: 0};

        if(_oldSystemId !== null) {
            let conditionOld = [
                {name: "mapId", operator: "=", value: this.options.mapId},
                {name: "id", operator: "=", value: _oldSystemId},
                {name: "visible", operator: "=", value: true},
            ];

            let oldSystemPositionResult = await core.dbController.mapSystemsTable.getByCondition(conditionOld, ["position"]);

            if (oldSystemPositionResult.length > 0) {
                let oldPosition = oldSystemPositionResult[0].position;
                newPosition = {x: oldPosition.x + 200, y: oldPosition.y};
            }
        }

        return newPosition;
    },

    async updateSystem (_systemId, _data) {
        let condition = [
            {name: "id", operator: "=", value: _systemId},
            {name: "mapId", operator: "=", value: this.options.mapId},
        ];

        let attrs = core.dbController.mapSystemsTable.attributes();

        for(let attr in _data) {
            if(!attrs.indexOf(attr)) {
                throw "Error: you try update not exist attribute";
            }
        }

        await core.dbController.mapSystemsTable.setByCondition(condition, _data);

        if (this._notifySystems && this._systemsSubscriber) {
            this._systemsSubscriber.notify({
                type: "systemUpdated",
                systemId: _systemId,
                data: _data
            });
        }
    },
    async updateLink (_linkId, _data) {
        let condition = [
            {name: "id", operator: "=", value: _linkId},
            {name: "mapId", operator: "=", value: this.options.mapId},
        ];

        let attrs = core.dbController.mapLinksTable.attributes();

        for(let attr in _data) {
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
    },
    async updateSystemsPosition (_systemsPosition) {
        let prarr = [];
        for (let a = 0; a < _systemsPosition.length; a++) {
            let systemPosition = _systemsPosition[a];

            let condition = [
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

        if (this._notifySystems && this._systemsSubscriber) {
            this._systemsSubscriber.notify({
                type: "updatedSystemsPosition",
                systemsPosition: _systemsPosition
            });
        }

        await Promise.all(prarr);
    },

    async getSystemInfo (_systemId) {
        this._createSystemObject(_systemId);
        return await this._systems[_systemId].getInfo();
    },

    async getLinkInfo (_linkId) {
        let condition = [
            {name: "id", operator: "=", value: _linkId},
            {name: "mapId", operator: "=", value: this.options.mapId}
        ]

        let info = await core.dbController.mapLinksTable.getByCondition(condition, core.dbController.mapLinksTable.attributes());
        return info[0];
    },

    async getSystems () {
        let condition = [
            {name: "mapId", operator: "=", value: this.options.mapId},
            {name: "visible", operator: "=", value: true},
        ];

        let result = await core.dbController.mapSystemsTable.getByCondition(condition, ["id"]);
        let resultArr = await Promise.all(result.map(_system => this.getSystemInfo(_system.id)));

        return resultArr;
    },
    async getLinks () {
        let condition = [
            {name: "mapId", operator: "=", value: this.options.mapId}
        ];
        let result = await core.dbController.mapLinksTable.getByCondition(condition, ["id"]);
        return result.map(_item => _item.id);
    },
    async systemExists (_systemId) {
        let condition = [
            {name: "mapId", operator: "=", value: this.options.mapId},
            {name: "id", operator: "=", value: _systemId},
        ];
        let result = await core.dbController.mapSystemsTable.getByCondition(condition, ["id"]);
        return result.length > 0;
    },

    // ============================
    //  SUBSCRIPTIONS METHODS
    // ============================
    _createExistenceSubscriber () {
        if(!this._existenceSubscriber) {
            this._existenceSubscriber = new Subscriber({
                responseCommand: "responseEveMapExistence",
                onStart: function () {
                    this._notifyExistence = true;
                }.bind(this),
                onStop: function () {
                    this._notifyExistence = false;
                }.bind(this)
            });
        }
    },
    _createSystemsSubscriber () {
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
        }
    },
    _createLinksSubscriber () {
        if(!this._linksSubscriber) {
            this._linksSubscriber = new Subscriber({
                responseCommand: "responseEveMapLinks",
                onStart: function () {
                    this._notifyLinks = true;
                }.bind(this),
                onStop: function () {
                    this._notifyLinks = false;
                }.bind(this)
            });
        }
    },
    subscribeSystems (_connectionId, _responseId) {
        this._createSystemsSubscriber();
        this._systemsSubscriber.addSubscriber(_connectionId, _responseId);
    },
    unsubscribeSystems (_connectionId, _responseId) {
        if (this._systemsSubscriber) {
            this._systemsSubscriber.removeSubscriber(_connectionId, _responseId);
        }
    },
    subscribeLinks (_connectionId, _responseId) {
        this._createLinksSubscriber()
        this._linksSubscriber.addSubscriber(_connectionId, _responseId);
    },
    unsubscribeLinks (_connectionId, _responseId) {
        if (this._linksSubscriber) {
            this._linksSubscriber.removeSubscriber(_connectionId, _responseId);
        }
    },
    subscribeExistence (connectionId, responseId) {
        this._createExistenceSubscriber();
        this._existenceSubscriber.addSubscriber(connectionId, responseId);
    },
    unsubscribeExistence (connectionId, responseId) {
        if (this._existenceSubscriber) {
            this._existenceSubscriber.removeSubscriber(connectionId, responseId);
        }
    }
});

module.exports = Map;