/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 2/27/21.
 */
const counterLog = require("../../../utils/counterLog");
const DBController = require("../../dbController");

const linkRemove = async function (mapId, linkId) {
  const condition = [
    { name: "mapId", operator: "=", value: mapId },
    { name: "id", operator: "=", value: linkId },
  ];

  const info = await core.dbController.mapLinksTable.getByCondition(
    condition,
    core.dbController.mapLinksTable.attributes(),
  );
  await core.dbController.mapLinksTable.removeByCondition(condition);

  // TODO !!check in future why it can happen
  if (!info[0]) {
    return;
  }

  return {
    source: info[0].solarSystemSource,
    target: info[0].solarSystemTarget,
    linkId,
  };
};

const getLinksBySystem = async function (mapId, systemId) {
  const lcondition = {
    operator: "AND",
    left: { name: "mapId", operator: "=", value: mapId },
    right: {
      operator: "OR",
      left: { name: "solarSystemSource", operator: "=", value: systemId },
      right: { name: "solarSystemTarget", operator: "=", value: systemId },
    },
  };
  const result = await core.dbController.mapLinksTable.getByCondition(
    lcondition,
    ["id"],
  );

  return result.map((x) => x.id);
};

const getLinkByEdges = async function (mapId, source, target) {
  const condition = `
        "mapId"='${mapId}' 
        AND 
        (
            ("solarSystemSource"='${source}' AND "solarSystemTarget"='${target}')
            OR
            ("solarSystemSource"='${target}' AND "solarSystemTarget"='${source}')
        );`;

  const attrs = core.dbController.mapLinksTable.attributes();

  const result = await core.dbController.mapLinksTable.getByCondition(
    condition,
    attrs,
  );
  return result.length > 0 ? result[0] : null;
};

const addLink = async function (mapId, chainId, source, target) {
  return await core.dbController.mapLinksTable.add({
    id: chainId,
    mapId,
    solarSystemSource: source,
    solarSystemTarget: target,
  });
};

const updateChainPassages = async function (mapId, chainId, count) {
  const condition = [
    { name: "mapId", operator: "=", value: mapId },
    { name: "id", operator: "=", value: chainId },
  ];
  await core.dbController.mapLinksTable.setByCondition(condition, {
    countOfPassage: count,
  });
};

const addChainPassageHistory = async function (
  mapId,
  source,
  target,
  characterId,
  shipTypeId,
) {
  await core.dbController.mapChainPassagesTable.add({
    mapId,
    solarSystemSourceId: source,
    solarSystemTargetId: target,
    characterId,
    shipTypeId,
  });
};

const addCharacterToSystem = async function (mapId, systemId, characterId) {
  const query = `INSERT INTO public.${core.dbController.mapSystemToCharacterTable.name()}
            ("mapId", "systemId", "characterId")
        SELECT '${mapId}', '${systemId}', '${characterId}'
        WHERE
            NOT EXISTS (
                SELECT "mapId" FROM public.${core.dbController.mapSystemToCharacterTable.name()} WHERE "mapId" = '${mapId}' AND "systemId" = '${systemId}' AND "characterId" = '${characterId}'
            );`;

  counterLog("SQL", query);
  await core.dbController.db.custom(query);
};

const removeCharacterFromSystem = async function (
  mapId,
  systemId,
  characterId,
) {
  const condition = [
    { name: "mapId", operator: "=", value: mapId },
    { name: "systemId", operator: "=", value: systemId },
    { name: "characterId", operator: "=", value: characterId },
  ];

  await core.dbController.mapSystemToCharacterTable.removeByCondition(
    condition,
  );
};

const getSystemPosition = async function (mapId, systemId) {
  const conditionOld = [
    { name: "mapId", operator: "=", value: mapId },
    { name: "id", operator: "=", value: systemId },
    { name: "visible", operator: "=", value: true },
  ];

  const result = await core.dbController.mapSystemsTable.getByCondition(
    conditionOld,
    ["position"],
  );

  return result.length > 0 ? result[0] : null;
};

const getSystemInfo = async function (
  mapId,
  systemId,
  includeInvisible = false,
) {
  const conditionOld = !includeInvisible
    ? [
        { name: "mapId", operator: "=", value: mapId },
        { name: "id", operator: "=", value: systemId },
        { name: "visible", operator: "=", value: true },
      ]
    : [
        { name: "mapId", operator: "=", value: mapId },
        { name: "id", operator: "=", value: systemId },
      ];

  const result = await core.dbController.mapSystemsTable.getByCondition(
    conditionOld,
    core.dbController.mapSystemsTable.attributes(),
  );

  return result.length > 0 ? result[0] : null;
};

const updateSystem = async function (mapId, systemId, data) {
  const attrs = core.dbController.mapSystemsTable.attributes();
  for (const attr in data) {
    if (!attrs.indexOf(attr)) {
      throw "Error: you try update not exist attribute";
    }
  }

  const condition = [
    { name: "id", operator: "=", value: systemId },
    { name: "mapId", operator: "=", value: mapId },
  ];

  await core.dbController.mapSystemsTable.setByCondition(condition, {
    ...data,
    updatedTime: new Date(),
  });
};

const updateChain = async function (mapId, chainId, data) {
  const attrs = core.dbController.mapLinksTable.attributes();

  for (const attr in data) {
    if (!attrs.indexOf(attr)) {
      throw "Error: you try update not exist attribute";
    }
  }

  const condition = [
    { name: "id", operator: "=", value: chainId },
    { name: "mapId", operator: "=", value: mapId },
  ];

  await core.dbController.mapLinksTable.setByCondition(condition, data);
};

const updateSystemsPosition = async function (mapId, systemsData) {
  const prarr = [];
  for (let a = 0; a < systemsData.length; a++) {
    const systemPosition = systemsData[a];

    const condition = [
      { name: "id", operator: "=", value: systemPosition.id },
      { name: "mapId", operator: "=", value: mapId },
    ];

    prarr.push(
      core.dbController.mapSystemsTable.setByCondition(condition, {
        position: {
          x: systemPosition.x,
          y: systemPosition.y,
        },
        updatedTime: new Date(),
      }),
    );
  }

  await Promise.all(prarr);
};

const updateSystemPosition = async function (mapId, solarSystemId, x, y) {
  const condition = [
    { name: "mapId", operator: "=", value: mapId },
    { name: "id", operator: "=", value: solarSystemId },
  ];

  await core.dbController.mapSystemsTable.setByCondition(condition, {
    position: {
      x,
      y,
    },
    updatedTime: new Date(),
  });
};

const getLinkInfo = async function (mapId, linkId) {
  const condition = [
    { name: "id", operator: "=", value: linkId },
    { name: "mapId", operator: "=", value: mapId },
  ];

  const info = await core.dbController.mapLinksTable.getByCondition(
    condition,
    core.dbController.mapLinksTable.attributes(),
  );
  return info[0];
};

const getSystems = async function (mapId) {
  const condition = [
    { name: "mapId", operator: "=", value: mapId },
    { name: "visible", operator: "=", value: true },
  ];
  const result = await core.dbController.mapSystemsTable.getByCondition(
    condition,
    ["id"],
  );
  return result.map((x) => x.id);
};

const getSystemsInfo = async function (mapId) {
  const condition = [
    { name: "mapId", operator: "=", value: mapId },
    { name: "visible", operator: "=", value: true },
  ];
  const result = await core.dbController.mapSystemsTable.getByCondition(
    condition,
    core.dbController.mapSystemsTable.attributes(),
  );
  return result;
};

const getLinks = async function (mapId) {
  const condition = [{ name: "mapId", operator: "=", value: mapId }];
  const result = await core.dbController.mapLinksTable.getByCondition(
    condition,
    ["id"],
  );
  return result.map((_item) => _item.id);
};

const getLinksWithData = async function (mapId, attrs) {
  const reqAttrs = [...attrs, "id"];
  const condition = [{ name: "mapId", operator: "=", value: mapId }];
  return await core.dbController.mapLinksTable.getByCondition(
    condition,
    reqAttrs,
  );
};

const getLinkPairs = async function (mapId) {
  const condition = [{ name: "mapId", operator: "=", value: mapId }];
  const result = await core.dbController.mapLinksTable.getByCondition(
    condition,
    ["id", "solarSystemSource", "solarSystemTarget"],
  );
  return result.map((item) => ({
    first: item.solarSystemSource,
    second: item.solarSystemTarget,
  }));
};

const getLinkPairsAdvanced = async function (
  mapId,
  includeFrig,
  includeEol,
  includeMassCrit,
) {
  const condition = [{ name: "mapId", operator: "=", value: mapId }];

  if (!includeMassCrit) {
    condition.push({ name: "massStatus", operator: "!=", value: 2 });
  }

  if (!includeEol) {
    condition.push({ name: "timeStatus", operator: "!=", value: 1 });
  }

  if (!includeFrig) {
    condition.push({ name: "shipSizeType", operator: "!=", value: 0 });
  }

  const result = await core.dbController.mapLinksTable.getByCondition(
    condition,
    ["id", "solarSystemSource", "solarSystemTarget"],
  );
  return result.map((item) => ({
    first: item.solarSystemSource,
    second: item.solarSystemTarget,
  }));
};

const systemExists = async function (mapId, systemId, checkVisible) {
  const condition = [
    { name: "mapId", operator: "=", value: mapId },
    { name: "id", operator: "=", value: systemId },
  ];

  checkVisible &&
    condition.push({ name: "visible", operator: "=", value: true });

  const result = await core.dbController.mapSystemsTable.getByCondition(
    condition,
    ["id"],
  );
  return result.length > 0;
};

const removeMap = async function (mapId) {
  const trArr = [];

  trArr.push(
    core.dbController.mapLinksTable.removeByCondition(
      [{ name: "mapId", operator: "=", value: mapId }],
      true,
    ),
  );

  trArr.push(
    core.dbController.mapSystemsTable.removeByCondition(
      [{ name: "mapId", operator: "=", value: mapId }],
      true,
    ),
  );

  trArr.push(
    core.dbController.mapSystemToCharacterTable.removeByCondition(
      [{ name: "mapId", operator: "=", value: mapId }],
      true,
    ),
  );

  await core.dbController.db.transaction(trArr);
  await core.dbController.mapsDB.remove(mapId);
};

const unlinkMapGroups = async function (mapId) {
  await core.dbController.linksTable.removeByCondition([
    {
      name: "type",
      operator: "=",
      value: DBController.linksTableTypes.mapToGroups,
    },
    { name: "first", operator: "=", value: mapId },
  ]);
};

const getMapLeaderboard = async (mapId) => {
  const q = `
    SELECT "mapId", "characterId", COUNT(*) as record_count
    FROM public.map_chain_passages
    WHERE "mapId"='${mapId}'
    GROUP BY "mapId", "characterId"
    ORDER BY record_count DESC;
  `;

  const { rows, rowCount } = await core.dbController.db.custom(q);

  return rowCount === 0 ? [] : rows;
};

const changeSystemVisibility = async (mapId, systemId, visible) => {
  await updateSystem(mapId, systemId, {
    visible,
    ...(!visible
      ? { tag: "", labels: "", position: { x: 0, y: 0 } }
      : { lastAddTime: new Date() }),
  });
};

const isSystemExistsAndVisible = async (mapId, systemId) => {
  const condition = [
    { name: "id", operator: "=", value: systemId },
    { name: "mapId", operator: "=", value: mapId },
  ];

  const result = await core.dbController.mapSystemsTable.getByCondition(
    condition,
    ["visible"],
  );

  return {
    exists: result.length > 0,
    visible: result.length > 0 && result[0].visible,
  };
};

async function countOnlineCharactersByLocations(locations) {
  // Проверяем, не пуст ли список локаций
  if (locations.length === 0) {
    return [];
  }

  // Формируем строку для условия SQL-запроса, чтобы выбрать строки, где location совпадает с одним из элементов массива
  const locationsPlaceholder = locations
    .map((_, index) => `$${index + 1}`)
    .join(", ");

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
    console.error("Error executing query:", error);
    return [];
  }
}

async function exportMap(mapId) {
  const systems = await core.dbController.mapSystemsTable.getByCondition(
    [{ name: "mapId", operator: "=", value: mapId }],
    core.dbController.mapSystemsTable.attributes(),
  );
  const links = await getLinks(mapId);
  const connections = await Promise.all(
    links.map((x) => getLinkInfo(mapId, x)),
  );
  const hubs = await core.dbController.mapsDB.get(mapId, "hubs");

  return {
    connections: connections.map((x) => ({
      id: x.id,
      // mapId: x.mapId,
      source: x.solarSystemSource,
      target: x.solarSystemTarget,
      mass_status: x.massStatus,
      time_status: x.timeStatus,
      ship_size_type: x.shipSizeType,
      // wormholeType: x.wormholeType,
      // countOfPassage: x.countOfPassage,
      // created: x.created,
      // updated: x.updated,
    })),
    hubs: hubs,
    systems: systems.map((x) => ({
      id: x.id,
      locked: x.isLocked,
      name: x.userName || x.name,
      description: x.description,
      tag: x.tag || null,
      labels: x.labels || null,
      status: x.status || 0,
      signatures: x.signatures,
      visible: x.visible,
      position: x.position,
    })),
  };
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
  exportMap,
};
