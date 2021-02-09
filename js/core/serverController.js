/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 1/15/21.
 */

const Emitter       = require("./../env/tools/emitter");
const classCreator  = require("./../env/tools/class");
const CustomPromise = require("./../env/promise.js");
const ServerStatus  = require("./../core/providers/status");

const ServerStatusController = classCreator("GroupsController", Emitter, {
    constructor: function GroupsController() {
        Emitter.prototype.constructor.call(this);
        this.serverStatusData = {
            online: false
        }
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

        let initChangeId = this.serverStatusProvider.on("change", (data) => {
            this._onServerStatusChange(data);
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
        if(this.gotServerStatus) {
            if(this.serverStatusData.online !== data.online)
                this.emit("changedStatus", this.serverStatusData.online);
        }
        this.serverStatusData = data;
    }
});


module.exports = ServerStatusController;