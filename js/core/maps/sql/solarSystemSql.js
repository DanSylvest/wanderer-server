/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 3/2/21.
 */

/**
 *
 * @param solarSystemId
 * @return {Promise<{systemClass: number}|null>}
 */
const getSolarSystemInfo = async function (solarSystemId) {
    let solarSystemInfo = await core.dbController.solarSystemsTable.getByCondition({
        name: "solarSystemId", operator: "=", value: solarSystemId
    }, core.dbController.solarSystemsTable.attributes());

    return solarSystemInfo.length > 0 ? solarSystemInfo[0] : null;
}

module.exports = {
    getSolarSystemInfo
}