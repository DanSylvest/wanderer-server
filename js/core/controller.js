const Emitter                = require("./../env/tools/emitter");
const classCreator           = require("./../env/tools/class");
const printf                 = require("./../env/tools/print_f");
const CustomPromise          = require("./../env/promise");
const log                    = require("./../utils/log");

const DbController           = require("./dbController");
const ServerController       = require("./serverController");
const UserController         = require("./userController");
const CharactersController   = require("./characters/controller");
const CorporationsController = require("./corporations/controller");
const AlliancesController    = require("./alliances/controller");
const MapController          = require("./maps/controller");
const GroupsController       = require("./groupsController");
const TokenController        = require("./tokenController");
const SDEController          = require("./sdeController");
const TempStorage            = require("./storage");
const ESI_API                = require("./../esi/api");

var Controller = classCreator("Controller", Emitter, {
    constructor: function Controller() {
        Emitter.prototype.constructor.call(this);

        this.esiApi                 = ESI_API;
        this.dbController           = new DbController();
        this.eveServer              = new ServerController();
        this.userController         = new UserController();
        this.tokenController        = new TokenController();
        this.charactersController   = new CharactersController();
        this.corporationsController = new CorporationsController();
        this.alliancesController    = new AlliancesController();
        this.mapController          = new MapController();
        this.groupsController       = new GroupsController();
        this.sdeController          = new SDEController();
        this.connectionStorage      = new TempStorage();
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    init: async function () {
        var pr = new CustomPromise();
        log(log.DEBUG, "start controller loading...");

        await this.dbController.init();

        var prarr = [];
        prarr.push(this.mapController.init());

        await Promise.all(prarr);

        this.initHandlers();

        this.eveServer.start();

        pr.resolve();

        return pr.native;
    },
    initHandlers () {
        this.eveServer.on("changedStatus", this._onServerStatusChanged.bind(this));
    },
    postInit: function ( ){
        api.on("connectionClosed", this._onConnectionClosed.bind(this));
    },
    _onConnectionClosed: async function (_connectionId) {
        if(this.connectionStorage.has(_connectionId)) {
            let token = this.connectionStorage.get(_connectionId);

            await this.userController.updateUserOfflineStatus(_connectionId, token);

            this.charactersController.connectionBreak(_connectionId);
            this.mapController.connectionBreak(_connectionId);
            this.eveServer.connectionBreak(_connectionId);
        }
    },
    _onServerStatusChanged (isOnline) {
        if(!isOnline) {
            this.charactersController.serverStatusOffline();
        } else {
            this.charactersController.serverStatusOnline();
        }
    }
});

module.exports = Controller;