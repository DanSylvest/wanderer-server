/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 10/31/20.
 */

const CustomPromise = require("./promise.js");
const child_process = require('child_process');

const execProcess = function (_command) {
    var pr = new CustomPromise();

    child_process.exec(_command, {shell: true}, function (_err, _in, _out) {
        if (_err)
            pr.reject(_err);
        else
            pr.resolve({in: _in, out: _out});
    });

    return pr.native;
}

module.exports = execProcess;