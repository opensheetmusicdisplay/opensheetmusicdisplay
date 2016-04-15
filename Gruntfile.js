module.exports = function (grunt) {
    'use strict';
    /*var BANNER = '**\n' +
        ' * Open Sheet Music Display library <%= pkg.version %> built on <%= grunt.template.today("yyyy-mm-dd") %>.\n' +
        ' * Copyright (c) 2016 PhonicScore\n' +
        ' *\n' +
        ' * https://github.com/opensheetmusicdisplay/opensheetmusicdisplay\n' +
        ' *\n';
    */
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        // Build output directories
        outputDir: {
            build: 'build',
            dist: 'dist'
        },
        // Browserify
        browserify: {
            dist: {
                src: [
                    'typings/browser.d.ts',
                    'typings/vexflow.d.ts',
                    'src/**/*.ts'
                ],
                dest: '<%= outputDir.build %>/osmd.js'
            },
            debug: {
                src: [
                    'typings/browser.d.ts', 'typings/vexflow.d.ts',
                    'src/**/*.ts', 'test/**/*.ts'
                ],
                dest: '<%= outputDir.build %>/osmd-debug.js',
                options: {
                    browserifyOptions: {
                        debug: true
                    }
                }
            },
            options: {
                plugin: ['tsify'],
                browserifyOptions: {
                  standalone: 'MeasureSizeCalculator'
                }
            }
        },
        // Uglify
        /*uglify: {
          options: {
            compress: {
              drop_console: true
            }
          },
          my_target: {
            files: {
              'build/osmd.js': ['src/input.js']
            }
          }
        },*/
        // Settings for tests
        karma: {
            // For continuous integration
            ci: {
                configFile: 'karma.conf.js',
                options: {
                    browsers: ['PhantomJS'],
                    files: [
                        '<%= browserify.debug.dest %>'
                    ]
                }
            },
            debugWithFirefox: {
                configFile: 'karma.conf.js',
                options: {
                    singleRun: false,
                    browsers: ['Firefox'],
                    files: [
                        '<%= browserify.debug.dest %>', {
                            pattern: 'src/**/*.ts',
                            included: false
                        }, {
                            pattern: 'test/**/*.ts',
                            included: false
                        }
                    ]
                }
            },
            debugWithChrome: {
                configFile: 'karma.conf.js',
                options: {
                    singleRun: false,
                    browsers: ['Chrome'],
                    files: [
                        '<%= browserify.debug.dest %>', {
                            pattern: 'src/**/*.ts',
                            included: false
                        }, {
                            pattern: 'test/**/*.ts',
                            included: false
                        }
                    ]
                }
            }
        },
        // TSLint setup
        tslint: {
            options: {
                configuration: 'tslint.json'
            },
            all: {
                src: ['<%= browserify.dist.src %>', '<%= browserify.debug.src %>']
            }
        },
        // TypeScript type definitions
        typings: {
            install: {}
        },
        docco: {
            src: ['src/**/*.ts'],
            options: {
                layout: 'linear',
                output: 'build/docs'
            }
        },
        // Settings for clean task
        clean: {
            options: {
                force: true
            },
            all: {
                src: [
                    '<%= outputDir.build %>',
                    '<%= outputDir.dist %>',
                    '.tscache'
                ]
            }
        }
    });

    // Load Npm tasks
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    //grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-tslint');
    grunt.loadNpmTasks('grunt-typings');

    // Register tasks
    grunt.registerTask('default', [ /*'tslint',*/ 'browserify', 'karma:ci']);
    //grunt.registerTask('lint', ['tslint', 'jscs']);
    grunt.registerTask('test', ['browserify:debug', 'karma:ci']);
    //grunt.registerTask('test debug Firefox', ['browserify:debug', 'karma:debugWithFirefox']);
    //grunt.registerTask('test debug Chrome', ['browserify:debug', 'karma:debugWithChrome']);
    grunt.registerTask('rebuild', ['clean', 'default']);
    grunt.registerTask('publish', ['clean', 'browserify:dist']);
    grunt.registerTask('all', ['typings', 'default']);
};
