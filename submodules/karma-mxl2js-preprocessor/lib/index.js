/*globals module*/
var escapeString = function (str) {
    'use strict';
    return str.replace(/'/g, '\\\'').replace(/\r?\n/g, '\\n\' +\n    \'');
};

var createPreprocessor = function (logger, basePath) {
    'use strict';
    return function (content, file, done) {
        var path = file.originalPath.replace(basePath + '/', ''),
            filename = path;

        file.path = file.path + '.js';
        done("window.__mxl__ = window.__mxl__ || {};\nwindow.__mxl__['" +
                filename + "'] = '" + escapeString(content) + "';\n"
              );
    };
};

createPreprocessor.$inject = ['logger', 'config.basePath'];

module.exports = {
    'preprocessor:mxl2js': ['factory', createPreprocessor]
};
