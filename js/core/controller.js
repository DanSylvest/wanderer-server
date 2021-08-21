const log = require("./../utils/log");

const DbController = require("./dbController");
const ServerController = require("./serverController");
const UserController = require("./userController");
const CharactersController = require("./characters/controller");
const CorporationsController = require("./corporations/controller");
const AlliancesController = require("./alliances/controller");
const MapController = require("./maps/controller");
const GroupsController = require("./groupsController");
const TokenController = require("./tokenController");
const SDEController = require("./sdeController");
const TempStorage = require("./storage");
const Thera = require("./other/thera");
const CachedDBData = require("./other/cachedDBData");
const ESI_API = require("./../esi/api");
const StaticData = require("./staticData.js");

class Controller {
    constructor() {
        this.esiApi = ESI_API;
        this.dbController = new DbController();
        this.eveServer = new ServerController();

        /** @type {UserController} */
        this.userController = new UserController();
        this.tokenController = new TokenController();
        this.charactersController = new CharactersController();
        this.corporationsController = new CorporationsController();
        this.alliancesController = new AlliancesController();
        this.mapController = new MapController();
        this.groupsController = new GroupsController();
        this.sdeController = new SDEController();
        this.connectionStorage = new TempStorage();
        this.thera = new Thera();
        this.cachedDBData = new CachedDBData();
        this.staticData = new StaticData();
    }

    async init() {
        log(log.DEBUG, "start controller loading...");

        await this.dbController.init();
        await Promise.all([
            this.mapController.init(),
            this.thera.init(),
            this.cachedDBData.init(),
        ]);

        this.initHandlers();

        this.eveServer.start();
    }

    initHandlers() {
        this.eveServer.on("changedStatus", this._onServerStatusChanged.bind(this));
    }

    postInit() {
        api.on("connectionClosed", this._onConnectionClosed.bind(this));
    }

    async _onConnectionClosed(_connectionId) {
        if (this.connectionStorage.has(_connectionId)) {
            let token = this.connectionStorage.get(_connectionId);

            await this.userController.updateUserOfflineStatus(_connectionId, token);

            this.charactersController.connectionBreak(_connectionId);
            this.mapController.connectionBreak(_connectionId);
            this.eveServer.connectionBreak(_connectionId);
        }
    }

    _onServerStatusChanged(isOnline) {
        if (!isOnline) {
            this.charactersController.serverStatusOffline();
        } else {
            this.charactersController.serverStatusOnline();
        }
    }
}

module.exports = Controller;