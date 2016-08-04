/*global module*/
module.exports = function (grunt) {
    'use strict';
    // The banner on top of the build
    var banner = '/**\n' +
        ' * Open Sheet Music Display <%= pkg.version %> built on <%= grunt.template.today("yyyy-mm-dd") %>.\n' +
        ' * Copyright (c) 2016 PhonicScore\n' +
        ' *\n' +
        ' * https://github.com/opensheetmusicdisplay/opensheetmusicdisplay\n' +
        ' */\n',
        typings = [
            'typings/index.d.ts',
            // Additional manual typings:
            'external/vexflow/vexflow.d.ts'
            // 'typings/fft.d.ts'
        ],
    // Paths
        src = ['src/**/*.ts'],
        test = ['test/**/*.ts'];

    // Grunt configuration following:
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner: '',
        // Build output directories
        outputDir: {
            build: 'build',
            dist: 'dist'
        },
        // Browserify
        browserify: {
            dist: {
                src: [].concat(typings, src),
                dest: '<%= outputDir.build %>/osmd.js',
                options: {
                    banner: "<%= banner %>"
                }
            },
            demo: {
                src: [].concat(typings, src, ['demo/inject.ts']),
                dest: '<%= outputDir.build %>/osmd-demo.js',
                options: {
                    banner: "<%= banner %>",
                    browserifyOptions: {
                        debug: true
                    }
                }
            },
            debug: {
                src: [].concat(typings, src, test),
                dest: '<%= outputDir.build %>/osmd-debug.js',
                options: {
                    banner: "<%= banner %>",
                    browserifyOptions: {
                        debug: true
                    }
                }
            },
            options: {
                plugin: ['tsify']
            }
        },
        // Uglify
        uglify: {
            options: {
                compress: {
                    drop_console: true
                },
                banner: banner,
                mangle: true,
                mangleProperties: true,
                preserveComments: 'all'
            },
            bundle: {
                files: {
                    'build/osmd.min.js': ['build/osmd.js']
                }
            }
        },
        // Karma setup
        karma: {
            // For continuous integration
            ci: {
                configFile: 'karma.conf.js',
                options: {
                    browsers: ['PhantomJS']
                }
            },
            debugWithFirefox: {
                configFile: 'karma.conf.js',
                options: {
                    singleRun: false,
                    browsers: ['Firefox']
                }
            },
            debugWithChrome: {
                configFile: 'karma.conf.js',
                options: {
                    singleRun: false,
                    browsers: ['Chrome']
                }
            }
        },
        // TSLint setup
        tslint: {
            options: {
                configuration: 'tslint.json'
            },
            all: {
                src: [].concat(src, test)
            }
        },
        // JsHint setup
        jshint: {
            all: [
                'Gruntfile.js', 'karma.conf.js',
                'submodules/**/*.json', 'submodules/**/*.js'
            ]
        },
        // TypeScript Type Definitions
        typings: {
            install: {}
        },
        // Cleaning task setup
        clean: {
            options: {
                force: true
            },
            all: {
                src: [
                    '<%= outputDir.build %>',
                    '<%= outputDir.dist %>',
                    // 'node_modules',
                    // 'typings',
                    '.tscache',
                    'src/**/*.js', 'test/**/*.js'
                ]
            }
        },
        // http-server
        'http-server': {
            'demo': {
                root: '.',
                port: 8000,
                host: '0.0.0.0',
                showDir : true,
                autoIndex: true,
                // server default file extension
                // ext: 'html',
                runInBackground: false,
                openBrowser : true,
                // customize url to serve specific pages
                customPages: {
                    '/': 'demo/demo.html'
                }
            }
        }

    });

    // Load Npm tasks
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-tslint');
    grunt.loadNpmTasks('grunt-typings');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-http-server');

    // Register tasks
    grunt.registerTask('lint',      ['jshint', 'tslint']);
    grunt.registerTask('start',     ['typings']);
    grunt.registerTask('all',       ['typings', 'default']);
    grunt.registerTask('default',   ['browserify:dist', 'uglify']);
    grunt.registerTask('npm-test',  ['typings', 'test']);
    grunt.registerTask('test',      ['browserify:debug', 'lint', 'karma:ci']);
    grunt.registerTask('fast-test', ['browserify:debug', 'karma:ci']);
    grunt.registerTask('rebuild',   ['clean', 'default']);
    grunt.registerTask('publish',   ['clean', 'typings', 'browserify:dist', 'uglify:bundle']);
    grunt.registerTask('debug-build', ['browserify:demo']);
    grunt.registerTask('debug-browser', ['http-server:demo']);

    // Fix these in the future:
    // grunt.registerTask('test debug Firefox', ['browserify:debug', 'karma:debugWithFirefox']);
    // grunt.registerTask('test debug Chrome', ['browserify:debug', 'karma:debugWithChrome']);
};
