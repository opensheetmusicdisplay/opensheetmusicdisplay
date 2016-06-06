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
            'typings/browser.d.ts',
            // Additional manual typings:
            'typings/vexflow.d.ts'
            // 'typings/fft.d.ts'
        ],
    // Paths
        src = ['src/**/*.ts'],
        test = ['test/**/*.ts'];

    // Grunt configuration following:
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner: banner,
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
                plugin: ['tsify']//,
                // browserifyOptions: {
                //     standalone: 'MeasureSizeCalculator'
                // }
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
            my_target: {
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
        // Documentation
        docco: {
            src: src,
            options: {
                layout: 'linear',
                output: 'build/docs'
            }
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
                    'node-modules',
                    '.tscache',
                    'src/**/*.js', 'test/**/*.js'
                ]
            }
        }
    });

    // Load Npm tasks
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-docco');
    grunt.loadNpmTasks('grunt-tslint');
    grunt.loadNpmTasks('grunt-typings');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Register tasks
    grunt.registerTask('all',     ['typings', 'default']);
    grunt.registerTask('start',   ['typings']);
    grunt.registerTask('default', ['lint', 'browserify', 'karma:ci', 'uglify']);
    grunt.registerTask('test',    ['lint', 'browserify:debug', 'karma:ci']);
    grunt.registerTask('fasttest', ['browserify:debug', 'karma:ci']);
    grunt.registerTask('rebuild', ['clean', 'default']);
    grunt.registerTask('publish', ['clean', 'browserify:dist', 'docco']);
    grunt.registerTask('lint',    ['jshint', 'tslint']);
    // Fix these in the future:
    // grunt.registerTask('test debug Firefox', ['browserify:debug', 'karma:debugWithFirefox']);
    // grunt.registerTask('test debug Chrome', ['browserify:debug', 'karma:debugWithChrome']);
};
