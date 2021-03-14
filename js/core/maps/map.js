/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */


const  Emitter        = require("./../../env/tools/emitter");
const classCreator    = require("./../../env/tools/class");
const exist           = require("./../../env/tools/exist");
const CustomPromise   = require("./../../env/promise");
const md5             = require("md5");
const Subscriber      = require("./../../utils/subscriber");
const Character       = require("./map/character");
const MapSolarSystem  = require("./map/solarSystem.js");
const mapSqlActions   = require("./sql/mapSqlActions.js");
const solarSystemSql  = require("./sql/solarSystemSql.js");
const ChainsManager   = require("./map/chainsManager.js");

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

        this._createChainsManager();
    },
    destructor () {
        this.chainsManager.destructor();

        Emitter.prototype.destructor.call(this);
    },

    async init () {
        this.chainsManager.start();
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

    connectionBreak (_connectionId) {
        this._systemsSubscriber && this._systemsSubscriber.removeSubscribersByConnection(_connectionId);
        this._linksSubscriber && this._linksSubscriber.removeSubscribersByConnection(_connectionId);
    },
    getSolarSystem (solarSystemId) {
        this._createSystemObject(solarSystemId);
        return this._systems[solarSystemId];
    },

    addCharactersToObserve (_characterIds) {
        _characterIds.map(_characterId => this._startObserverCharacter(_characterId));
    },
    removeCharactersFromObserve (_characterIds) {
        _characterIds.map(characterId => this.characters[characterId] && this.characters[characterId].startDropTimer())
    },

    _createChainsManager () {
        this.chainsManager = new ChainsManager(this.options.mapId);
        this.chainsManager.on("changedChains", this._onChainsChanged.bind(this))

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

    _onChainsChanged (chains) {
        chains.map(chain => {
            switch (chain.newState) {
                case "EOL":
                    this.updateLink(chain.id, {timeStatus: 1})
                    break;
                case "Expired":
                    this.linkRemove(chain.id);
                    break;
            }
        });
    },

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
        let currentSystemId = this._charactersOnSystem[characterId];
        this.characters[characterId].destructor();
        delete this.characters[characterId];
        if(isOnline && exist(currentSystemId)) {
            await this._characterLeaveSystem(characterId, currentSystemId);
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

    async _addSystem (_oldSystem, _systemId, position) {
        let pos = position;
        this._createSystemObject(_systemId);
        let solarSystem = this._systems[_systemId];

        let result = await solarSystem.isSystemExistsAndVisible();
        if(result.exists && result.visible) {
            // do nothing
            solarSystem.resolve();
        }
        else if(result.exists && !result.visible) {
            if(!exist(position))
                pos = await this.findPosition(_oldSystem, _systemId);

            await solarSystem.update(true, pos);
            solarSystem.resolve();

            await this._notifySystemAdd(_systemId);
        }
        else if (!result.exists) {
            let solarSystemInfo = await solarSystemSql.getSolarSystemInfo(_systemId);
            if (solarSystemInfo === null) {
                // solar system can be not found in list
                throw `Exception "Solar system ${_systemId} is not exists in database..."`
            }

            if(!exist(position))
                pos = await this.findPosition(_oldSystem, _systemId);

            await solarSystem.create(solarSystemInfo.solarSystemName, pos);
            solarSystem.resolve();

            await this._notifySystemAdd(_systemId);
        }

        return solarSystem.loadPromise();
    },
    async _addLink (_sourceSystemId, _targetSystemId) {
        // Получим промис, который отвечает за то, что уже кто-то загружает этот линк из базы
        let loadingPromise = this._links[_sourceSystemId + "_" + _targetSystemId] || this._links[_targetSystemId + "_" + _sourceSystemId];

        if (!loadingPromise) {
            loadingPromise = new CustomPromise();
            this._links[_sourceSystemId + "_" + _targetSystemId] = loadingPromise;

            let link = await mapSqlActions.getLinkByEdges(this.options.mapId, _sourceSystemId, _targetSystemId);
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
    async _linkPassage (_sourceSystemId, _targetSystemId, _characterId) {
        await this._addLink(_sourceSystemId, _targetSystemId);

        let link = await mapSqlActions.getLinkByEdges(this.options.mapId, _sourceSystemId, _targetSystemId);
        await mapSqlActions.updateChainPassages(this.options.mapId, link.id, ++link.countOfPassage);

        // await mapSqlActions.addChainPassageHistory(
        //     this.options.mapId,
        //     _sourceSystemId,
        //     _targetSystemId,
        //     _characterId,
        // )

        //TODO А после этого, нужно отправить оповещение в гуй, что линк id был проинкрементирован
    },
    async _characterJoinToSystem (_characterId, _systemId) {
        this._createSystemObject(_systemId);
        await mapSqlActions.addCharacterToSystem(this.options.mapId, _systemId, _characterId);

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
        if(exist(this._systems[_systemId])) {
            await mapSqlActions.removeCharacterFromSystem(this.options.mapId, _systemId, _characterId);
            this._systems[_systemId].onlineCharacters.removeByValue(_characterId);
            delete this._charactersOnSystem[_characterId];

            if (this._notifySystems && this._systemsSubscriber) {
                this._systemsSubscriber.notify({
                    type: "systemUpdatedList",
                    list: [
                        {
                            type: "onlineUpdate",
                            systemId: _systemId,
                            onlineCount: this._systems[_systemId].onlineCharacters.length
                        },
                        {type: "userLeave", systemId: _systemId, characterId: _characterId},
                    ]
                });
            }
        }
    },
    async _characterEnterToSystem (_characterId, _systemId) {
        let ssInfo = await solarSystemSql.getSolarSystemInfo(_systemId);
                // let solarSystemInfo = await core.sdeController.getSolarSystemInfo(_systemId);
        // let systemClass = await core.sdeController.getSystemClass(solarSystemInfo.regionID, solarSystemInfo.constellationID, _systemId);
        let isExists = await this.systemExists(_systemId, true);
        let isAbleToEnter = solarSystemTypesNotAbleToEnter.indexOf(ssInfo.systemClass) === -1;

        // This is will filter Jita. Because wormhole can not be open to Jita.
        switch (_systemId) {
            case 30000142:
                isAbleToEnter = false;
                break;
        }

        // Это происходит, когда нет никаких систем, и персонаж первый раз попал на карту
        if(!isExists && isAbleToEnter) {
            await this._addSystem(null, _systemId);
            isExists = true;
        }

        // Это происходит когда система уже была добавлена: вручную или в результате прохода в неё.
        if(isExists)
            await this._characterJoinToSystem(_characterId, _systemId);
    },
    async _characterMoveToSystem (_characterId, _oldSystem, _newSystem) {
        // System can be chained by gates and if it true, we consider system in known space.
        // But also system can be chained by the wormhole also, but we can detect it.
        let isJump = await core.sdeController.checkSystemJump(_oldSystem, _newSystem);

        let isAbleToMove = /*solarSystemTypesNotAbleToMove.indexOf(_newSystem) === -1*/ true;
        // const solarSystemTypesNotAbleToMove = [19,20,21,22,23,24];

        // This is will filter Jita. Because wormhole can not be open to Jita.
        switch (_newSystem) {
            case 30000142:
                isAbleToMove = false;
                break;
        }

        if (!isJump && isAbleToMove) {
            let isSystemExists = await this.systemExists(_oldSystem);
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
            let isDestSystemExists = await this.systemExists(_newSystem, true);
            let isOldSystemExists = await this.systemExists(_oldSystem, true);

            if (isOldSystemExists)
                await this._characterLeaveSystem(_characterId, _oldSystem);

            if (isDestSystemExists) {
                await this._addSystem(_oldSystem, _newSystem);
                await this._characterJoinToSystem(_characterId, _newSystem);
            }
        }
    },

    async addChainManual (sourceSolarSystemId, targetSolarSystemId) {
        // надо проверить что система соединяется
        let link = await mapSqlActions.getLinkByEdges(this.options.mapId, sourceSolarSystemId, targetSolarSystemId);

        if(!exist(link)) {
            await this._addLink(sourceSolarSystemId, targetSolarSystemId);
        }
    },
    async addManual (solarSystemId, x, y) {
        this._createSystemObject(solarSystemId);
        let solarSystem = this._systems[solarSystemId];
        let result = await solarSystem.isSystemExistsAndVisible();

        if(result.visible)
            throw "System already exists in map";

        await this._addSystem(null, solarSystemId, {x: x, y: y});

        for(let characterId in this.characters) {
            let character = this.characters[characterId];
            if(character.isOnline() && character.location() === solarSystemId) {
                await this._characterJoinToSystem(characterId, solarSystemId);
            }
        }
    },
    async addHub (solarSystemId) {
        let hubs = await core.dbController.mapsDB.get(this.options.mapId, "hubs");

        let hasSystem = hubs.indexOf(solarSystemId.toString()) !== -1;

        if(!hasSystem) {
            hubs.push(solarSystemId.toString());
            await core.dbController.mapsDB.set(this.options.mapId, "hubs", hubs);
        }
    },
    async removeHub (solarSystemId) {
        let hubs = await core.dbController.mapsDB.get(this.options.mapId, "hubs");

        let index = hubs.indexOf(solarSystemId.toString());
        if(index !== -1) {
            hubs.removeByIndex(index);
            await core.dbController.mapsDB.set(this.options.mapId, "hubs", hubs);
        }
    },
    async getHubs () {
        return await core.dbController.mapsDB.get(this.options.mapId, "hubs");
    },
    async getRoutesListForSolarSystem (solarSystemId) {
        let out = [];
        let hubs = await this.getHubs();

        let links = await this.getLinkPairs();
        let connections = links.map(x => x.first + "|" + x.second)
            .concat(links.map(x => x.second + "|" + x.first));

        let arrRoutes = await Promise.all(hubs.map(destination => this.loadRoute(destination, solarSystemId, "shortest", connections)));

        for(let a = 0; a < arrRoutes.length; a++) {
            let destination = hubs[a];
            let route = arrRoutes[a];

            let arrInfo = await Promise.all(route.systems.map(x => this.getSolarSystem(x).staticInfo()));

            out.push({
                hasConnection: route.hasConnection,
                systems: arrInfo,
                origin: solarSystemId,
                destination: destination
            })
        }

        return out;
    },
    loadRoute (dest, origin, flag, connections) {
        let pr = new CustomPromise();

        core.esiApi.routes(dest, origin, flag, connections)
            .then(
                event => pr.resolve({hasConnection: true,systems: event}),
                err => pr.resolve({hasConnection: false,systems: [dest]})
            );

        return pr.native;
    },
    async findPosition (_oldSystemId, _systemId) {
        let newPosition = {x: 0, y: 0};

        if(_oldSystemId !== null) {
            let oldSystemPositionResult = await mapSqlActions.getSystemPosition(this.options.mapId, _systemId);

            if (exist(oldSystemPositionResult)) {
                let oldPosition = oldSystemPositionResult.position;
                newPosition = {x: oldPosition.x + 200, y: oldPosition.y};
            }
        }

        return newPosition;
    },
    async updateSystem (_systemId, _data) {
        await mapSqlActions.updateSystem(this.options.mapId, _systemId, _data);

        if (this._notifySystems && this._systemsSubscriber) {
            this._systemsSubscriber.notify({
                type: "systemUpdated",
                systemId: _systemId,
                data: _data
            });
        }
    },
    async updateLink (_linkId, _data) {
        for(let attr in _data) {
            if(attr === "timeStatus")
                _data = {..._data, updated: new Date}
        }

        await mapSqlActions.updateChain(this.options.mapId, _linkId, _data);

        if (this._notifyLinks) {
            this._linksSubscriber.notify({
                type: "linkUpdated",
                linkId: _linkId,
                data: _data
            });
        }
    },
    async updateSystemsPosition (_systemsPosition) {
        await mapSqlActions.updateSystemsPosition(this.options.mapId, _systemsPosition);

        if (this._notifySystems && this._systemsSubscriber) {
            this._systemsSubscriber.notify({
                type: "updatedSystemsPosition",
                systemsPosition: _systemsPosition
            });
        }
    },
    async getSystemInfo (_systemId) {
        this._createSystemObject(_systemId);
        return await this._systems[_systemId].getInfo();
    },
    async getLinkInfo (_linkId) {
        return await mapSqlActions.getLinkInfo(this.options.mapId, _linkId);
    },
    async getSystems () {
        let systems = await mapSqlActions.getSystems(this.options.mapId);
        return await Promise.all(systems.map(systemId => this.getSystemInfo(systemId)));
    },
    async getLinks () {
        return await mapSqlActions.getLinks(this.options.mapId);
    },
    async getLinkPairs () {
        return await mapSqlActions.getLinkPairs(this.options.mapId);
    },
    async systemExists (_systemId, checkVisible) {
        return await mapSqlActions.systemExists(this.options.mapId, _systemId, checkVisible);
    },
    async linkRemove (_linkId) {
        // todo - процес удаления линка может быть только один раз
        // поэтому его надо блокировать
        let info = await mapSqlActions.linkRemove(this.options.mapId, _linkId);

        // we need remove from this._links
        delete this._links[info.source + "_" + info.target];
        delete this._links[info.target + "_" + info.source];

        if (this._notifyLinks) {
            this._linksSubscriber.notify({
                type: "removed",
                linkId: _linkId
            })
        }
    },
    async systemRemove (_systemId) {
        await this._systems[_systemId].update(false);
        let affectedLinks = await mapSqlActions.getLinksBySystem(this.options.mapId, _systemId);
        await Promise.all(affectedLinks.map(linkId => this.linkRemove(linkId)));

        await Promise.all(this._systems[_systemId].onlineCharacters.map(x => {
            delete this._charactersOnSystem[x]
            return mapSqlActions.removeCharacterFromSystem(this.options.mapId, _systemId, x);
        }));

        if (this._notifySystems && this._systemsSubscriber) {
            this._systemsSubscriber.notify({
                type: "removed",
                systemId: _systemId
            });
        }

        delete this._systems[_systemId];
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

const solarSystemTypesNotAbleToEnter = [7,8,9,19,20,21,22,23,24];
const solarSystemTypesNotAbleToMove = [19,20,21,22,23,24];

module.exports = Map;