/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 1/15/21.
 */

const Emitter       = require("./../env/tools/emitter");
const Group         = require("./group");
const classCreator  = require("./../env/tools/class");
const exist         = require("./../env/tools/exist");
const CustomPromise = require("./../env/promise.js");
const md5           = require("md5");
const DBController  = require("./dbController");
const ServerStatus  = require("./../core/providers/status");

const GroupsController = classCreator("GroupsController", Emitter, {
    constructor: function GroupsController() {
        Emitter.prototype.constructor.call(this);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    connectionBreak: function (_connectionId) {

    },
    async init () {
        this.gotServerStatus = false;

        let pr = new CustomPromise();
        this.createStatusProvider();

        let initChangeId = this.serverStatusProvider.on("change", () => {
            this.serverStatusProvider.off(initChangeId);
            this.gotServerStatus = true;
            pr.resolve();
        });
        this.serverStatusProvider.start();

        return pr.native;
    },
    createStatusProvider () {
        this.serverStatusProvider = new ServerStatus();
        this._sspHandleId = this.serverStatusProvider.on("change", this._onServerStatusChange.bind(this));
    },
    _onServerStatusChange (data) {
        this.serverStatusData = data;

        if(this.gotServerStatus) {
            this.emit("changedStatus", this.serverStatusData.online);
        }
    }
});


module.exports = GroupsController;