const Path          = require('./../env/tools/path');
const fs            = require('fs');
const ConfReader    = require("./../utils/configReader");
const CustomPromise = require("./../env/promise");
const https         = require('https');
const unzipper      = require('unzipper');
const log           = require("./../utils/log.js");

const config = new ConfReader("conf").build();
const dirPath  = Path.fromBackSlash(__dirname);
dirPath.pop();

const EVE_SWAGGER_LINK = "https://esi.evetech.net/latest/swagger.json";
const SWAGGER_GENERATOR_LINK = 'https://generator.swagger.io/api/gen/clients/javascript';
const tempFileName = './swaggerArchive.temp.zip';
const destination = new Path("js/esi/generated", true);

const loadFile = function (fileName, link) {
    let pr = new CustomPromise();

    const file = fs.createWriteStream(fileName);
    const request = https.get(link, function(response) {
        response.pipe(file);

        file.on('finish', function() {
            pr.resolve();
            file.close();
        });
    });

    request.on("error", err => pr.reject(err));

    return pr.native;
}

const post = function (href, data) {
    let pr = new CustomPromise();
    let postData = JSON.stringify(data);

    let options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
        }
    };

    let req = https.request(href, options, res => {
        let out = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: {}
        }
        res.setEncoding('utf8');
        res.on('data', (d) => {
            out.body = JSON.parse(d);
            pr.resolve(out);
        });
    });

    req.on('error', e => pr.reject(e));
    req.write(postData);
    req.end();

    return pr.native;
}

const extract = function (src, dst) {
    let pr = new CustomPromise();

    let tempFileStream = fs.createReadStream(src);
    let extractor = unzipper.Extract({path: dst});
    tempFileStream.pipe(extractor);

    extractor.on("finish", () => {
        tempFileStream.close();
        pr.resolve();
    });

    return pr.native;
}


const generator = async function () {
    log(log.INFO, "Start generating swagger...");

    try {
        log(log.INFO, `Start generating swagger client: ${SWAGGER_GENERATOR_LINK} => ${EVE_SWAGGER_LINK}`);
        let result = await post(SWAGGER_GENERATOR_LINK, {swaggerUrl: EVE_SWAGGER_LINK});
        log(log.INFO, "Complete generated swagger client.");

        log(log.INFO, `Start loading swagger archive: ${result.body.link} => ${tempFileName}`);
        await loadFile(tempFileName, result.body.link);
        log(log.INFO, "Complete loaded swagger archive.");

        log(log.INFO, `Start extracting swagger archive: ${tempFileName} => ${destination.toString()}`);
        await extract(tempFileName, destination.toString());
        log(log.INFO, "Complete extracted swagger archive.");

        log(log.INFO, `Removing temp archive: ${tempFileName}`);
        fs.unlinkSync(tempFileName);
        log(log.INFO, "Complete removed temp archive.");

    } catch (err) {
        console.error("Error on generating:", err);
    }

    log(log.INFO, `End generating swagger`);
}

module.exports = generator;