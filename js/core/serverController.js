/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 1/15/21.
 */

const Emitter       = require("./../env/tools/emitter");
const classCreator  = require("./../env/tools/class");
const CustomPromise = require("./../env/promise.js");
const ServerStatus  = require("./../core/providers/status");
const Subscriber    = require("./../utils/subscriber")

const ServerStatusController = classCreator("GroupsController", Emitter, {
    constructor: function GroupsController() {
        Emitter.prototype.constructor.call(this);
        this.statusData = {
            online: false
        }
        this.notifyStatus = false;
        this.createStatusProvider();
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    connectionBreak: function (_connectionId) {
        if(this.subscriptionStatus) {
            this.subscriptionStatus.removeSubscribersByConnection(_connectionId);
        }
    },
    start () {
        this.serverStatusProvider.start();
    },
    createStatusProvider () {
        this.serverStatusProvider = new ServerStatus();
        this._sspHandleId = this.serverStatusProvider.on("change", this._onServerStatusChange.bind(this));
    },
    _onServerStatusChange (data) {
        if(this.statusData.online !== data.online) {
            this.emit("changedStatus", data.online);

            if(this.notifyStatus) {
                this.subscriptionStatus.notify({
                    type: "status",
                    isOnline: data.online
                });
            }
        }

        this.statusData = data;
    },
    isOnline() {
        return this.statusData.online;
    },
    subscribeStatus (connectionId, responseId) {
        this._createStatusSubscription();

        this.subscriptionStatus.addSubscriber(connectionId, responseId);
        this.subscriptionStatus.notifyFor(connectionId, responseId, {
            type: "status",
            isOnline: this.statusData.online
        });
    },
    unsubscribeStatus (connectionId, responseId) {
        this.subscriptionStatus.removeSubscriber(connectionId, responseId);
    },
    _createStatusSubscription () {
        if (!this.subscriptionStatus) {
            this.subscriptionStatus = new Subscriber({
                responseCommand: "eveServerStatus",
                onStart: () => {
                    this.notifyStatus = true
                },
                onStop: () => {
                    this.notifyStatus = false
                }
            });
        }
    }

});


module.exports = ServerStatusController;