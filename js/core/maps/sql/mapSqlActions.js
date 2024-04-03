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

  await core.dbController.mapSystemsTable.setByCondition(condition, {
    ...data,
    updatedTime: new Date()
  });
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
      updatedTime: new Date(),
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
    updatedTime: new Date(),
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


const getSystemsInfo = async function (mapId) {
  let condition = [
    { name: 'mapId', operator: '=', value: mapId },
    { name: 'visible', operator: '=', value: true },
  ];
  let result = await core.dbController.mapSystemsTable.getByCondition(
    condition,
    core.dbController.mapSystemsTable.attributes()
  );
  return result
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

const changeSystemVisibility = async (mapId, systemId, visible) => {
  await updateSystem(mapId, systemId, { visible, ...(!visible ? { tag: '' } : { lastAddTime: new Date() }) });

}

const isSystemExistsAndVisible =  async (mapId, systemId) => {
  let condition = [
    { name: 'id', operator: '=', value: systemId },
    { name: 'mapId', operator: '=', value: mapId },
  ];

  let result = await core.dbController.mapSystemsTable.getByCondition(condition, ['visible']);

  return {
    exists: result.length > 0,
    visible: result.length > 0 && result[0].visible,
  };
}

async function countOnlineCharactersByLocations(locations) {
  // Проверяем, не пуст ли список локаций
  if (locations.length === 0) {
    return [];
  }

  // Формируем строку для условия SQL-запроса, чтобы выбрать строки, где location совпадает с одним из элементов массива
  const locationsPlaceholder = locations.map((_, index) => `$${index + 1}`).join(', ');

  // Формируем SQL-запрос
  const query = `
    SELECT location, COUNT(*) as character_count
    FROM characters
    WHERE online = TRUE AND location IN (${locationsPlaceholder})
    GROUP BY location;
  `;

  // Выполняем запрос, передавая список локаций как параметры
  try {
    const result = await core.dbController.db.custom(query, locations);
    // Возвращаем результат
    return result.rows;
  } catch (error) {
    console.error('Error executing query:', error);
    return [];
  }
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
  getSystemsInfo,
  getSystemInfo,
  getLinks,
  getLinkPairsAdvanced,
  getLinksWithData,
  getLinkPairs,
  systemExists,
  removeMap,
  unlinkMapGroups,
  getMapLeaderboard,
  changeSystemVisibility,
  isSystemExistsAndVisible,
  countOnlineCharactersByLocations,
};