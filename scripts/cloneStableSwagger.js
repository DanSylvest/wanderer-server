const fs = require("fs");
const git = require("simple-git");
const Path = require("../js/env/tools/path");
// const ConfReader = require('../js/utils/configReader');
const log = require("../js/utils/log");

const dirPath = Path.fromBackSlash(__dirname);
dirPath.pop();
const generatedPath = dirPath["+"](["esi", "generated"]);
const REPO_NAME = "eve-js-generated-api-stable";
const REPO = `https://github.com/DanSylvest/${REPO_NAME}.git`;
const repoPath = dirPath.copy().pop(true)["+="](REPO_NAME);

const cloneStableSwagger = async function () {
  log(log.INFO, "Start cloning stable EVE API...");

  try {
    if (fs.existsSync(generatedPath.toString())) {
      fs.rmSync(generatedPath.toString(), { recursive: true });
    }

    if (fs.existsSync(repoPath.toString())) {
      fs.rmSync(repoPath.toString(), { recursive: true });
    }

    console.log(`Cloning ${REPO}...`);
    await git().clone(REPO, `./${REPO_NAME}`);

    fs.renameSync(
      repoPath["+"]("generated").toString(),
      generatedPath.toString(),
    );
    fs.rmSync(repoPath.toString(), { recursive: true });
  } catch (err) {
    console.error("Error on cloning:", err);
  }

  log(log.INFO, "End cloning stable EVE API");
};

// generator();
//
module.exports = cloneStableSwagger;
