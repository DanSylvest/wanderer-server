/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 2/22/21.
 */

const fs = require("fs");

module.exports = {
    fileExists (path) {
        return fs.existsSync(path);
    }
};