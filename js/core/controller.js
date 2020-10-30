var Emitter                = require("./../env/tools/emitter");
var classCreator           = require("./../env/tools/class");
var printf                 = require("./../env/tools/print_f");
var CustomPromise          = require("./../env/promise");
var log                    = require("./../utils/log");

var DbController           = require("./dbController");
var UserController         = require("./userController");
var CharactersController   = require("./characters/controller");
var CorporationsController = require("./corporations/controller");
var AlliancesController    = require("./alliances/controller");
var MapController          = require("./maps/controller");
var GroupsController       = require("./groupsController");
var TokenController        = require("./tokenController");
var SDEController          = require("./sdeController");
var MDController           = require("./mdController");
var FDController           = require("./fdController");
var TempStorage            = require("./storage");
var ESI_API                = require("./../core/eveSwaggerInterface/api");

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
        this.fdController           = new FDController();

        this.connectionStorage      = new TempStorage();
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    init: async function () {
        var pr = new CustomPromise();
        log(log.DEBUG, printf("start controller loading..."));

        // try {
            await this.dbController.init();
        // }catch (e) {
        //     debugger;
        // }
        var prarr = [];
        prarr.push(this.mapController.init());
        prarr.push(this.fdController.init());

        await Promise.all(prarr);

        pr.resolve();

        return pr.native;
    },
    postInit: function ( ){
        api.on("connectionClosed", this._onConnectionClosed.bind(this));
    },
    _onConnectionClosed: async function (_connectionId) {
        if(this.connectionStorage.has(_connectionId)) {
            var token = this.connectionStorage.get(_connectionId);

            // notify controllers
            this.charactersController.connectionBreak(_connectionId);
            this.mapController.connectionBreak(_connectionId);

            try {
                // SET USER OFFLINE
                var userId = await this.tokenController.checkToken(token);
                await this.userController.setOnline(userId, false);

                this.mapController.userOffline(userId);

                log(log.INFO, printf("User [%s] was disconnected from server.", userId));
                this.connectionStorage.del(_connectionId);
            } catch (_err) {
                debugger;
            }
        }
    }
});

module.exports = Controller;