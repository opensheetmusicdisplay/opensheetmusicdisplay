/*globals module*/
var escapeString = function (str) {
    'use strict';
    return str.replace(/'/g, '\\\'').replace(/\r?\n/g, '\\n\' +\n    \'');
};

var createPreprocessor = function (logger, basePath) {
    'use strict';
    return function (content, file, done) {
        var xmlPath = file.originalPath.replace(basePath + '/', ''),
            filename = xmlPath;

        file.path = file.path + '.js';
        done("window.__xml__ = window.__xml__ || {};\nwindow.__xml__['" +
                filename + "'] = new DOMParser().parseFromString('" + escapeString(content) +
                "', 'text/xml');\n"
              );
    };
};

createPreprocessor.$inject = ['logger', 'config.basePath'];

module.exports = {
    'preprocessor:musicxml2js': ['factory', createPreprocessor]
};
