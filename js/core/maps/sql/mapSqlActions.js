/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 2/27/21.
 */
const counterLog = require('./../../../utils/counterLog');
const DBController = require('./../../dbController');

const linkRemove = async function (mapId, linkId) {
  let condition = [
    { name: 'mapId', operator: '=', value: mapId },
    { name: 'id', operator: '=', value: linkId },
  ];

  let info = await core.dbController.mapLinksTable.getByCondition(condition, core.dbController.mapLinksTable.attributes());
  await core.dbController.mapLinksTable.removeByCondition(condition);

  // TODO !!check in future why it can happen
  if(!info[0]) {
    return;
  }

  return {
    source: info[0].solarSystemSource,
    target: info[0].solarSystemTarget,
    linkId: linkId,
  };
};

const getLinksBySystem = async function (mapId, systemId) {
  let lcondition = {
    operator: 'AND',
    left: { name: 'mapId', operator: '=', value: mapId },
    right: {
      operator: 'OR',
      left: { name: 'solarSystemSource', operator: '=', value: systemId },
      right: { name: 'solarSystemTarget', operator: '=', value: systemId },
    },
  };
  let result = await core.dbController.mapLinksTable.getByCondition(lcondition, ['id']);

  return result.map(x => x.id);
};

const getLinkByEdges = async function (mapId, source, target) {
  let condition = `
        "mapId"='${ mapId }' 
        AND 
        (
            ("solarSystemSource"='${ source }' AND "solarSystemTarget"='${ target }')
            OR
            ("solarSystemSource"='${ target }' AND "solarSystemTarget"='${ source }')
        );`;

  let attrs = core.dbController.mapLinksTable.attributes();

  let result = await core.dbController.mapLinksTable.getByCondition(condition, attrs);
  return result.length > 0 ? result[0] : null;
};

const addLink = async function (mapId, chainId, source, target) {
  return await core.dbController.mapLinksTable.add({
    id: chainId,
    mapId: mapId,
    solarSystemSource: source,
    solarSystemTarget: target,
  });
};

const updateChainPassages = async function (mapId, chainId, count) {
  let condition = [
    { name: 'mapId', operator: '=', 'value': mapId },
    { name: 'id', operator: '=', 'value': chainId },
  ];
  await core.dbController.mapLinksTable.setByCondition(condition, {
    countOfPassage: count,
  });
};

const addChainPassageHistory = async function (mapId, source, target, characterId, shipTypeId) {
  await core.dbController.mapChainPassagesTable.add({
    mapId: mapId,
    solarSystemSourceId: source,
    solarSystemTargetId: target,
    characterId: characterId,
    shipTypeId: shipTypeId,
  });
};

const addCharacterToSystem = async function (mapId, systemId, characterId) {
  let query = `INSERT INTO public.${core.dbController.mapSystemToCharacterTable.name()}
            ("mapId", "systemId", "characterId")
        SELECT '${mapId}', '${systemId}', '${characterId}'
        WHERE
            NOT EXISTS (
                SELECT "mapId" FROM public.${core.dbController.mapSystemToCharacterTable.name()} WHERE "mapId" = '${mapId}' AND "systemId" = '${systemId}' AND "characterId" = '${characterId}'
            );`;

  counterLog('SQL', query);
  await core.dbController.db.custom(query);
};

const removeCharacterFromSystem = async function (mapId, systemId, characterId) {
  let condition = [
    { name: 'mapId', operator: '=', value: mapId },
    { name: 'systemId', operator: '=', value: systemId },
    { name: 'characterId', operator: '=', value: characterId },
  ];

  await core.dbController.mapSystemToCharacterTable.removeByCondition(condition);
};

const getSystemPosition = async function (mapId, systemId) {
  let conditionOld = [
    { name: 'mapId', operator: '=', value: mapId },
    { name: 'id', operator: '=', value: systemId },
    { name: 'visible', operator: '=', value: true },
  ];

  let result = await core.dbController.mapSystemsTable.getByCondition(conditionOld, ['position']);

  return result.length > 0 ? result[0] : null;
};

const getSystemInfo = async function (mapId, systemId, includeInvisible = false) {
  let conditionOld = !includeInvisible ? [
    { name: 'mapId', operator: '=', value: mapId },
    { name: 'id', operator: '=', value: systemId },
    { name: 'visible', operator: '=', value: true },
  ] : [
    { name: 'mapId', operator: '=', value: mapId },
    { name: 'id', operator: '=', value: systemId },
  ];

  let result = await core.dbController.mapSystemsTable.getByCondition(conditionOld, core.dbController.mapSystemsTable.attributes());

  return result.length > 0 ? result[0] : null;
};

const updateSystem = async function (mapId, systemId, data) {
  let attrs = core.dbController.mapSystemsTable.attributes();
  for (let attr in data) {
    if (!attrs.indexOf(attr)) {
      throw 'Error: you try update not exist attribute';
    }
  }

  let condition = [
    { name: 'id', operator: '=', value: systemId },
    { name: 'mapId', operator: '=', value: mapId },
  ];

  await core.dbController.mapSystemsTable.setByCondition(condition, data);
};

const updateChain = async function (mapId, chainId, data) {
  let attrs = core.dbController.mapLinksTable.attributes();

  for (let attr in data) {
    if (!attrs.indexOf(attr)) {
      throw 'Error: you try update not exist attribute';
    }
  }

  let condition = [
    { name: 'id', operator: '=', value: chainId },
    { name: 'mapId', operator: '=', value: mapId },
  ];

  await core.dbController.mapLinksTable.setByCondition(condition, data);
};

const updateSystemsPosition = async function (mapId, systemsData) {
  let prarr = [];
  for (let a = 0; a < systemsData.length; a++) {
    let systemPosition = systemsData[a];

    let condition = [
      { name: 'id', operator: '=', value: systemPosition.id },
      { name: 'mapId', operator: '=', value: mapId },
    ];

    prarr.push(core.dbController.mapSystemsTable.setByCondition(condition, {
      position: {
        x: systemPosition.x,
        y: systemPosition.y,
      },
    }));
  }

  await Promise.all(prarr);
};


const updateSystemPosition = async function (mapId, solarSystemId, x, y) {
  let condition = [
    { name: 'mapId', operator: '=', value: mapId },
    { name: 'id', operator: '=', value: solarSystemId },
  ];

  await core.dbController.mapSystemsTable.setByCondition(condition, {
    position: {
      x: x,
      y: y,
    },
  });
};

const getLinkInfo = async function (mapId, linkId) {
  let condition = [
    { name: 'id', operator: '=', value: linkId },
    { name: 'mapId', operator: '=', value: mapId },
  ];

  let info = await core.dbController.mapLinksTable.getByCondition(condition, core.dbController.mapLinksTable.attributes());
  return info[0];
};

const getSystems = async function (mapId) {
  let condition = [
    { name: 'mapId', operator: '=', value: mapId },
    { name: 'visible', operator: '=', value: true },
  ];
  let result = await core.dbController.mapSystemsTable.getByCondition(condition, ['id']);
  return result.map(x => x.id);
};

const getLinks = async function (mapId) {
  let condition = [
    { name: 'mapId', operator: '=', value: mapId },
  ];
  let result = await core.dbController.mapLinksTable.getByCondition(condition, ['id']);
  return result.map(_item => _item.id);
};

const getLinksWithData = async function (mapId, attrs) {
  let reqAttrs = [...attrs, 'id'];
  let condition = [{ name: 'mapId', operator: '=', value: mapId }];
  return await core.dbController.mapLinksTable.getByCondition(condition, reqAttrs);
};

const getLinkPairs = async function (mapId) {
  let condition = [
    { name: 'mapId', operator: '=', value: mapId },
  ];
  let result = await core.dbController.mapLinksTable.getByCondition(condition, ['id', 'solarSystemSource', 'solarSystemTarget']);
  return result.map(item => ({ first: item.solarSystemSource, second: item.solarSystemTarget }));
};


const getLinkPairsAdvanced = async function (mapId, includeFrig, includeEol, includeMassCrit) {
  let condition = [{ name: 'mapId', operator: '=', value: mapId }];

  if (!includeMassCrit) {
    condition.push({ name: 'massStatus', operator: '!=', value: 2 });
  }

  if (!includeEol) {
    condition.push({ name: 'timeStatus', operator: '!=', value: 1 });
  }

  if (!includeFrig) {
    condition.push({ name: 'shipSizeType', operator: '!=', value: 0 });
  }

  let result = await core.dbController.mapLinksTable.getByCondition(condition, ['id', 'solarSystemSource', 'solarSystemTarget']);
  return result.map(item => ({ first: item.solarSystemSource, second: item.solarSystemTarget }));
};

const systemExists = async function (mapId, systemId, checkVisible) {
  let condition = [
    { name: 'mapId', operator: '=', value: mapId },
    { name: 'id', operator: '=', value: systemId },
  ];

  checkVisible && condition.push({ name: 'visible', operator: '=', value: true });

  let result = await core.dbController.mapSystemsTable.getByCondition(condition, ['id']);
  return result.length > 0;
};

const removeMap = async function (mapId) {
  let trArr = [];

  trArr.push(core.dbController.mapLinksTable.removeByCondition([
    { name: 'mapId', operator: '=', value: mapId },
  ], true));

  trArr.push(core.dbController.mapSystemsTable.removeByCondition([
    { name: 'mapId', operator: '=', value: mapId },
  ], true));

  trArr.push(core.dbController.mapSystemToCharacterTable.removeByCondition([
    { name: 'mapId', operator: '=', value: mapId },
  ], true));

  await core.dbController.db.transaction(trArr);
  await core.dbController.mapsDB.remove(mapId);
};

const unlinkMapGroups = async function (mapId) {
  await core.dbController.linksTable.removeByCondition([
    { name: 'type', operator: '=', value: DBController.linksTableTypes.mapToGroups },
    { name: 'first', operator: '=', value: mapId },
  ]);
};

const getMapLeaderboard = async (mapId) => {
  let q = `
    SELECT "mapId", "characterId", COUNT(*) as record_count
    FROM public.map_chain_passages
    WHERE "mapId"='${mapId}'
    GROUP BY "mapId", "characterId"
    ORDER BY record_count DESC;
  `;

  const { rows, rowCount } = await core.dbController.db.custom(q);

  return rowCount === 0 ? [] : rows;
}

module.exports = {
  linkRemove,
  getLinksBySystem,
  getLinkByEdges,
  addLink,
  updateChainPassages,
  addCharacterToSystem,
  removeCharacterFromSystem,
  getSystemPosition,
  updateSystem,
  updateChain,
  addChainPassageHistory,
  updateSystemsPosition,
  updateSystemPosition,

  getLinkInfo,
  getSystems,
  getSystemInfo,
  getLinks,
  getLinkPairsAdvanced,
  getLinksWithData,
  getLinkPairs,
  systemExists,
  removeMap,
  unlinkMapGroups,
  getMapLeaderboard,
};