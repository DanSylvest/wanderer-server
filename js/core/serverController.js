/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 1/15/21.
 */

const Emitter = require("../env/tools/emitter");
const ServerStatus = require("./providers/status");
const Subscriber = require("../utils/_new/subscriber");

class ServerStatusController extends Emitter {
  constructor() {
    super();
    this.statusData = {
      online: false,
    };
    this.notifyStatus = false;
    this.createStatusProvider();
  }

  connectionBreak(_connectionId) {
    if (this.subscriptionStatus) {
      this.subscriptionStatus.removeSubscribersByConnection(_connectionId);
    }
  }

  start() {
    this.serverStatusProvider.start();
  }

  createStatusProvider() {
    this.serverStatusProvider = new ServerStatus();
    this._sspHandleId = this.serverStatusProvider.on(
      "change",
      this._onServerStatusChange.bind(this),
    );
  }

  _onServerStatusChange(data) {
    if (this.statusData.online !== data.online) {
      this.emit("changedStatus", data.online);

      if (this.notifyStatus) {
        this.subscriptionStatus.notify({
          type: "status",
          isOnline: data.online,
        });
      }
    }

    this.statusData = data;
  }

  isOnline() {
    return this.statusData.online;
  }

  subscribeStatus(connectionId, responseId) {
    this._createStatusSubscription();

    this.subscriptionStatus.addSubscriber(connectionId, responseId);
    this.subscriptionStatus.notifyFor(connectionId, responseId, {
      type: "bulk",
      isOnline: this.statusData.online,
    });
  }

  unsubscribeStatus(connectionId, responseId) {
    this.subscriptionStatus.removeSubscriber(connectionId, responseId);
  }

  _createStatusSubscription() {
    if (!this.subscriptionStatus) {
      this.subscriptionStatus = new Subscriber({
        responseCommand: "eveServerStatus",
        onStart: () => {
          this.notifyStatus = true;
        },
        onStop: () => {
          this.notifyStatus = false;
        },
      });
    }
  }
}

module.exports = ServerStatusController;
