/* eslint-disable */

/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/28/20.
 */

const ApiClient = require('./external/src/ApiClient');
const index = require('./external/src/index');

const test = async function () {
  // ApiClient, index.SearchApi
  // debugger;

  const location = new index.LocationApi();

  const id = 96278263;
  var opts = {};
  opts.datasource = 'tranquility';
  opts.ifNoneMatch = 'ifNoneMatch_example';
  opts.token = 'token_example';

  location.getCharactersCharacterIdOnline(id, opts, (error, data, response) => {
    debugger;
  });

  const instance = new index.SearchApi();

  const categories = ['character'];
  const search = 'Ilia Volyeva';
  var opts = {
    acceptLanguage: 'en-us',
    datasource: 'tranquility',
    ifNoneMatch: 'ifNoneMatch_example',
    language: 'en-us',
    strict: false,
  };

  const response = function (_count, error, data, response) {
    console.log(JSON.stringify(instance, true, 3));

    if (_count === 999) debugger;

    if (error) debugger;

    debugger;
  };

  for (let a = 0; a < 1; a++) {
    instance.getSearch(categories, search, opts, response.bind(this, a));
  }
};

test();
