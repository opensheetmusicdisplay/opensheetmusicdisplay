// Karma configuration
// Generated on Fri Feb 05 2016 12:36:08 GMT+0100 (CET)
/*globals module*/
module.exports = function (config) {
    'use strict';
    config.set({
        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'chai'],

        // list of files to exclude
        exclude: [],

        files: [{
            pattern: 'build/osmd-test.js'
        }, {
            pattern: 'src/**/*.ts',
            included: false
        }, {
            pattern: 'test/**/*.ts',
            included: false
        }, {
            pattern: 'test/data/*.xml',
            included: true
        }, {
            pattern: 'test/data/*.mxl.base64',
            included: true
        }, {
            pattern: 'test/data/*.mxl',
            included: false,
            watched: false,
            served: true
        }],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'test/data/*.xml': ['xml2js'],
            'test/data/*.mxl.base64': ['base64-to-js']
        },

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['mocha'],

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_ERROR,

        client: {
            captureConsole: true
        },

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: [], // Will be overruled by karma grunt task options

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: Infinity
    });
};
