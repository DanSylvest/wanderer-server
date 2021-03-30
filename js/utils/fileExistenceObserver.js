/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 2/22/21.
 */

const fs = require("fs");

module.exports = {
    fileExists (path) {
        return fs.existsSync(path);
    }
};