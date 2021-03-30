/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 2/13/21.
 */

// const Emitter        = require("./../env/tools/emitter");
// const classCreator   = require("./../env/tools/class");
const extend         = require("./../env/tools/extend");
const CustomPromise  = require("./../env/promise");

let counter = 0;
const ST_INITIAL = counter++;
const ST_CHECKING = counter++;
const ST_EMPTY = counter++;
const ST_LOADING = counter++;
const ST_CACHE_UPDATING = counter++;
const ST_LOADED = counter++;
//
// const CachedObject = classCreator("CacheDB", Emitter, {
//     constructor (_options) {
//         this.options = extend({
//             id: undefined,
//             expireTime: 10000,
//             lifetime: 10000,
//             remoteGetterAsync: (resolve, reject) => {resolve({
//                 exists: true,
//                 data: 0
//             })},
//             dbGetterAsync: (resolve, reject) => {resolve({exists: false, data: null, expires: -1})},
//             dbSetterAsync: ({data, expires}, resolve, reject) => {}
//         }, _options);
//
//         Emitter.prototype.constructor.call(this);
//
//         // check correct id
//         if(this.options.id === undefined)
//             throw "Exception: 'Id is undefined - you MUST set id for CachedObject;'"
//
//         this._expires = -1;
//         this._data = Object.create(null);
//         this._getQueue = [];
//         this._loadState = ST_INITIAL;
//         this._dataLoadedOnce = false;
//
//     },
//     destructor () {
//
//         Emitter.prototype.destructor.call(this);
//     },
//     get () {
//         // add promise to load queue
//         let pr = new CustomPromise();
//         this._getQueue.push(pr);
//
//         this._updateState();
//
//         return pr.native;
//     },
//
//     _updateState () {
//         // check data existence
//         // if data not load we MUST get it
//         switch(this._loadState) {
//             case ST_INITIAL:
//                 // this._loadRemoteData();
//                 // first - check in db
//                 this._checkDB();
//                 break;
//             case ST_EMPTY:
//                 this._loadRemoteData();
//                 break;
//             case ST_LOADING:
//                 break;
//             case ST_CACHE_UPDATING:
//                 break;
//             case ST_LOADED:
//                 if(!this._isExpiredLocal()) {
//                     this._resolveQueue();
//                 } else {
//                     this._loadRemoteData();
//                 }
//                 break;
//         }
//     },
//
//     _checkDB () {
//         let pr = new CustomPromise();
//
//         this.options.dbGetterAsync(pr.resolve, pr.reject);
//
//         pr.native.then(
//             result => {
//                 if(!result.exists) {
//                     this._loadState = ST_EMPTY;
//                     this._updateState();
//                 } else {
//                     this._loadState = ST_LOADED;
//                     this._data = result.data;
//                     this._expires = result.expires;
//                     this._updateState();
//                 }
//             },
//             error => {
//                 // Если что-то пошло не так прям в базе данных...
//                 // но наверно до такого нельзя допускать
//                 throw {error: error, message : "Error on get from database"};
//             }
//         )
//     },
//
//     _loadRemoteData () {
//         if(this._loadState === ST_LOADING) {
//             throw "Exception: 'Don't try loadData when status is LOADING'."
//         }
//
//         this._loadState = ST_LOADING;
//
//         let pr = new CustomPromise();
//         this.options.remoteGetterAsync(pr.resolve, pr.reject);
//
//         pr.native.then(
//             data => {
//                 this._updateSecondLevelCache(data);
//             },
//             error => {
//                 if(this._dataLoadedOnce) {
//                     this._loadState = ST_LOADED;
//                     this._resolveQueue();
//                 } else {
//                     // what need do if we got error and don't have data?
//                     // how to handle this error?
//                     this._loadState = ST_EMPTY;
//                     this._rejectQueue(error);
//                 }
//             }
//         )
//
//     },
//     /**
//      * Second level cache - currently is DB
//      * @private
//      */
//     _updateSecondLevelCache (data) {
//         let expires = +new Date + this.options.expireTime
//
//         this._loadState = ST_CACHE_UPDATING;
//
//         let pr = new CustomPromise();
//         this.options.dbSetterAsync({data, expires}, pr.resolve, pr.reject);
//
//         pr.native.then(
//             () => {
//                 this._dataLoadedOnce = true;
//                 this._loadState = ST_LOADED;
//                 this._data = data;
//                 this._expires = expires;
//                 this._resolveQueue();
//             },
//             error => {
//                 throw {error: error, message : "Error on set to database"};
//             }
//         )
//
//     },
//     _isExpiredLocal () {
//         return this._expires <= (+new Date)
//     },
//     _resolveQueue() {
//         this._getQueue.map(pr => pr.resolve(this._data));
//     },
//     _rejectQueue(err) {
//         this._getQueue.map(pr => pr.reject(err));
//     }
// });



class CachedObject {
    constructor(_options) {
        this.options = extend({
            // id: undefined,
            expireTime: 10000,
            lifetime: 10000,
            remoteGetterAsync: (resolve, reject) => {
                resolve({
                    exists: true,
                    data: 0
                })
            },
            dbGetterAsync: (resolve, reject) => {
                resolve({exists: false, data: null, expires: -1})
            },
            dbSetterAsync: ({data, expires}, resolve, reject) => {
            }
        }, _options);

        // Emitter.prototype.constructor.call(this);

        // check correct id
        // if (this.options.id === undefined)
        //     throw "Exception: 'Id is undefined - you MUST set id for CachedObject;'"

        this._expires = -1;
        this._data = Object.create(null);
        this._getQueue = [];
        this._loadState = ST_INITIAL;
        this._dataLoadedOnce = false;

    }

    destructor() {

        // Emitter.prototype.destructor.call(this);
    }

    get() {
        // add promise to load queue
        let pr = new CustomPromise();
        this._getQueue.push(pr);

        switch (this._loadState) {
            case ST_INITIAL:
            case ST_LOADED:
                this._updateState();
                break;
        }

        return pr.native;
    }

    _updateState() {
        // check data existence
        // if data not load we MUST get it
        switch (this._loadState) {
            case ST_INITIAL:
                // this._loadRemoteData();
                // first - check in db
                this._checkDB();
                break;
            case ST_CHECKING:
                break;
            case ST_EMPTY:
                this._loadRemoteData();
                break;
            case ST_LOADING:
            case ST_CACHE_UPDATING:
                break;
            case ST_LOADED:
                if (!this._isExpiredLocal()) {
                    this._resolveQueue();
                } else {
                    this._loadRemoteData();
                }
                break;
        }
    }

    _checkDB() {
        let pr = new CustomPromise();

        this.options.dbGetterAsync(pr.resolve, pr.reject);

        this._loadState = ST_CHECKING;

        pr.native.then(
            result => {
                if (!result.exists) {
                    this._loadState = ST_EMPTY;
                    this._updateState();
                } else {
                    this._loadState = ST_LOADED;
                    this._data = result.data;
                    this._expires = result.expires;
                    this._updateState();
                }
            },
            error => {
                // Если что-то пошло не так прям в базе данных...
                // но наверно до такого нельзя допускать
                throw {error: error, message: "Error on get from database"};
            }
        )
    }

    _loadRemoteData() {
        if (this._loadState === ST_LOADING) {
            throw "Exception: 'Don't try loadData when status is LOADING'."
        }

        this._loadState = ST_LOADING;

        let pr = new CustomPromise();
        this.options.remoteGetterAsync(pr.resolve, pr.reject);

        pr.native.then(
            data => {
                this._updateSecondLevelCache(data);
            },
            error => {
                if (this._dataLoadedOnce) {
                    this._loadState = ST_LOADED;
                    this._resolveQueue();
                } else {
                    // what need do if we got error and don't have data?
                    // how to handle this error?
                    this._loadState = ST_EMPTY;
                    this._rejectQueue(error);
                }
            }
        )

    }

    /**
     * Second level cache - currently is DB
     * @private
     */
    _updateSecondLevelCache(data) {
        let expires = +new Date + this.options.expireTime

        this._loadState = ST_CACHE_UPDATING;

        let pr = new CustomPromise();
        this.options.dbSetterAsync({data, expires}, pr.resolve, pr.reject);

        pr.native.then(
            () => {
                this._dataLoadedOnce = true;
                this._loadState = ST_LOADED;
                this._data = data;
                this._expires = expires;
                this._resolveQueue();
            },
            error => {
                throw {error: error, message: "Error on set to database"};
            }
        )

    }

    _isExpiredLocal() {
        return this._expires <= (+new Date)
    }

    _resolveQueue() {
        this._getQueue.map(pr => pr.resolve(this._data));
    }

    _rejectQueue(err) {
        this._getQueue.map(pr => pr.reject(err));
    }
}


module.exports = CachedObject;