const random = (min, max) => parseInt(min + (max - min) * Math.random(), 10);

module.exports = { random };
