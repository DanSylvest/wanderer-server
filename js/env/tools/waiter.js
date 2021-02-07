/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 1/20/21.
 */

const waiter = function (ms) {
    ms = ms || 0;
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
};

module.exports = waiter;