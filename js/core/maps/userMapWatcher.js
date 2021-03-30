/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 11/22/20.
 */

class UserMapWatcher {
    _data = Object.create(null);

    constructor () {

    }

    addUser (userId) {
        if(!(userId in this._data)) {
            this._data[userId] = Object.create(null);
        }
    }

    hasUser (userId) {
        return this._data[userId] !== undefined;
    }

    removeUser (userId) {
        delete this._data[userId];
    }

    addConnection (userId, connectionId) {
        this.addUser(userId);

        if(!(connectionId in this._data[userId])) {
            this._data[userId][connectionId] = Object.create(null);
        }
    }

    hasConnection (userId, connectionId) {
        return this._data[userId] && connectionId in this._data[userId]
    }

    set (userId, connectionId, mapId, bool) {
        this.addConnection(userId, connectionId);

        this._data[userId][connectionId][mapId] = bool;
    }

    eachMap (userId, connectionId, callback) {
        this.addConnection(userId, connectionId);

        for(let mapId in this._data[userId][connectionId]) {
            callback.call(null, mapId, this._data[userId][connectionId][mapId]);
        }
    }

    get (userId, connectionId, mapId) {
        this.addConnection(userId, connectionId);
        return !!this._data[userId][connectionId][mapId];
    }

    isUserWatchOnMap (userId, mapId) {
        if(!this.hasUser(userId))
            return false;

        let isWatchingOnMap = false;
        for(let connId in this._data[userId]) {
            isWatchingOnMap = this._data[userId][connId][mapId];

            if(isWatchingOnMap)
                break;
        }
        return !!isWatchingOnMap;
    }

    getMapsWhichUserWatch (userId) {
        let out = Object.create(null);

        if(this._data[userId]) {
            for(let connId in this._data[userId]) {
                for(let mapId in this._data[userId][connId]) {
                    if(!out[mapId] && this._data[userId][connId][mapId]) {
                        out[mapId] = true;
                    }
                }
            }
        }

        return Object.keys(out);
    }

    removeMapFromAllUsers (mapId) {
        for(let userId in this._data) {
            for (let connId in this._data[userId]) {
                delete this._data[userId][connId][mapId];
            }
        }
    }


}

module.exports = UserMapWatcher;