const systemClasses = {
  ccp1: -1,
  c1: 1,
  c2: 2,
  c3: 3,
  c4: 4,
  c5: 5,
  c6: 6,
  hs: 7,
  ls: 8,
  ns: 9,
  ccp2: 10,
  ccp3: 11,
  thera: 12,
  c13: 13,
  sentinel: 14,
  baribican: 15,
  vidette: 16,
  conflux: 17,
  redoubt: 18,
  a1: 19,
  a2: 20,
  a3: 21,
  a4: 22,
  a5: 23,
  ccp4: 24,
  pochven: 25,
  zarzakh: 10100,

  unknown: 100100, // this class of systems will guaranty that no one real class will take that place
};

const namedSystems = {
  'Jita': 30000142,
};

const prohibitedSystems = [
  namedSystems.Jita,
];

const whSpace = [
  systemClasses.c1,
  systemClasses.c2,
  systemClasses.c3,
  systemClasses.c4,
  systemClasses.c5,
  systemClasses.c6,
  systemClasses.c13,
  systemClasses.thera,
  systemClasses.sentinel,
  systemClasses.baribican,
  systemClasses.vidette,
  systemClasses.conflux,
  systemClasses.redoubt,
]

const knownSpace = [
  systemClasses.hs,
  systemClasses.ls,
  systemClasses.ns,
]

const prohibitedSystemClasses = [
  systemClasses.a1,
  systemClasses.a2,
  systemClasses.a3,
  systemClasses.a4,
  systemClasses.a5,
  systemClasses.ccp4,
];

module.exports = {
  whSpace,
  knownSpace,
  systemClasses,
  namedSystems,
  prohibitedSystemClasses,
  prohibitedSystems,
};