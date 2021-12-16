const fs = require('fs');
const path = require('path');

class KW_WebpackPlugin {
  constructor(options) {
    this.karmaEmitter = options.karmaEmitter;
    this.controller = options.controller;
  }

  apply(compiler) {
    this.compiler = compiler;

    // webpack bundles are finished
    compiler.hooks.done.tap('KW_WebpackPlugin', (stats) => {
      // read generated file content and store for karma preprocessor
      this.controller.bundlesContent = {};
      stats.toJson().assets.forEach((webpackFileObj) => {
        const filePath = path.resolve(
          compiler.options.output.path,
          webpackFileObj.name
        );
        this.controller.bundlesContent[webpackFileObj.name] = fs.readFileSync(
          filePath,
          'utf-8'
        );
      });

      // karma refresh
      this.karmaEmitter.refreshFiles();
    });
  }
}

module.exports = KW_WebpackPlugin;
