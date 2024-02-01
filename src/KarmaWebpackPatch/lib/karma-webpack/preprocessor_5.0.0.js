const path = require('path');

const glob = require('glob');
const minimatch = require('minimatch');

const { ensureWebpackFrameworkSet } = require('../karma/validation');
const { hash } = require('../utils/hash');

const KW_Controller = require('./controller');

function getPathKey(filePath, withExtension = false) {
  const pathParts = path.parse(filePath);
  const key = `${pathParts.name}.${hash(filePath)}`;
  return withExtension ? `${key}${pathParts.ext}` : key;
}

function configToWebpackEntries(config) {
  const filteredPreprocessorsPatterns = [];
  const { preprocessors } = config;

  let files = [];
  config.files.forEach((fileEntry, i) => {
    // forcefully disable karma watch as we use webpack watch only
    config.files[i].watched = false;
    files = [...files, ...glob.sync(fileEntry.pattern)];
  });

  Object.keys(preprocessors).forEach((pattern) => {
    if (preprocessors[pattern].includes('webpack')) {
      filteredPreprocessorsPatterns.push(pattern);
    }
  });

  const filteredFiles = [];
  files.forEach((filePath) => {
    filteredPreprocessorsPatterns.forEach((pattern) => {
      if (minimatch(filePath, pattern)) {
        filteredFiles.push(filePath);
      }
    });
  });

  const webpackEntries = {};
  filteredFiles.forEach((filePath) => {
    webpackEntries[getPathKey(filePath)] = filePath;
  });

  return webpackEntries;
}

function KW_Preprocessor(config, emitter) {
  const controller = new KW_Controller();
  config.__karmaWebpackController = controller;
  ensureWebpackFrameworkSet(config);

  // one time setup
  if (controller.isActive === false) {
    controller.updateWebpackOptions({
      entry: configToWebpackEntries(config),
      watch: config.autoWatch,
    });

    if (config.webpack.entry) {
      console.warn(`
karma-webpack does not currently support custom entries, if this is something you need,
consider opening an issue.
ignoring attempt to set the entry option...
      `);
      delete config.webpack.entry;
    }

    controller.updateWebpackOptions(config.webpack);
    controller.karmaEmitter = emitter;
  }

  const normalize = (file) => file.replace(/\\/g, '/');

  const transformPath =
    config.webpack.transformPath ||
    ((filepath) => {
      // force *.js files by default
      const info = path.parse(filepath);
      return `${path.join(info.dir, info.name)}.js`;
    });

  return async function processFile(content, file, done) {
    await controller.bundle();

    file.path = normalize(file.path); // eslint-disable-line no-param-reassign

    const transformedFilePath = transformPath(getPathKey(file.path, true));
    const bundleContent = controller.bundlesContent[transformedFilePath];

    file.path = transformedFilePath;

    done(null, bundleContent);
  };
}

KW_Preprocessor.$inject = ['config', 'emitter'];

module.exports = KW_Preprocessor;
