/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 2/14/21.
 */

const CachedObject = require("./../../utils/cachedObject");

class Cache {
    constructor () {

    }

    destructor () {

    }

    get (id) {

        let cObj = new CachedObject({
            remoteGetterAsync: (resolve, reject) => {
                // resolve({
                //     exists: true,
                //     data: 0
                // })
                // api.
            },
            dbGetterAsync: (resolve, reject) => {
                resolve({exists: false, data: null, expires: -1})
            },
            dbSetterAsync: ({data, expires}, resolve, reject) => {
            }
        })
    }
}