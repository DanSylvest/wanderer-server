const Emitter                = require("./../env/tools/emitter");
const classCreator           = require("./../env/tools/class");
const printf                 = require("./../env/tools/print_f");
const CustomPromise          = require("./../env/promise");
const log                    = require("./../utils/log");

const DbController           = require("./dbController");
const UserController         = require("./userController");
const CharactersController   = require("./characters/controller");
const CorporationsController = require("./corporations/controller");
const AlliancesController    = require("./alliances/controller");
const MapController          = require("./maps/controller");
const GroupsController       = require("./groupsController");
const TokenController        = require("./tokenController");
const SDEController          = require("./sdeController");
const MDController           = require("./mdController");
const TempStorage            = require("./storage");
const ESI_API                = require("./../esi/api");

var Controller = classCreator("Controller", Emitter, {
    constructor: function Controller() {
        Emitter.prototype.constructor.call(this);

        this.esiApi                 = ESI_API;
        this.dbController           = new DbController();
        this.userController         = new UserController();
        this.tokenController        = new TokenController();
        this.charactersController   = new CharactersController();
        this.corporationsController = new CorporationsController();
        this.alliancesController    = new AlliancesController();
        this.mapController          = new MapController();
        this.groupsController       = new GroupsController();
        this.sdeController          = new SDEController();
        this.mdController           = new MDController();
        this.connectionStorage      = new TempStorage();
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    init: async function () {
        var pr = new CustomPromise();
        log(log.DEBUG, "start controller loading...");

        // try {
            await this.dbController.init();
        // }catch (e) {
        //     debugger;
        // }
        var prarr = [];
        prarr.push(this.mapController.init());

        await Promise.all(prarr);

        pr.resolve();

        return pr.native;
    },
    postInit: function ( ){
        api.on("connectionClosed", this._onConnectionClosed.bind(this));
    },
    _onConnectionClosed: async function (_connectionId) {
        if(this.connectionStorage.has(_connectionId)) {
            let token = this.connectionStorage.get(_connectionId);

            await this.userController.updateUserOfflineStatus(_connectionId, token);

            // if(isOffline) {
            this.charactersController.connectionBreak(_connectionId);
            this.mapController.connectionBreak(_connectionId);
            // }
            // notify controllers
        }
    }
});

module.exports = Controller;