module.exports = function (grunt) {
    'use strict';
    // The banner on top of the build
    var banner = '/**\n' +
        ' * Open Sheet Music Display <%= pkg.version %> built on <%= grunt.template.today("yyyy-mm-dd") %>.\n' +
        ' * Copyright (c) 2016 PhonicScore\n' +
        ' *\n' +
        ' * https://github.com/opensheetmusicdisplay/opensheetmusicdisplay\n' +
        ' */\n';
    // Additional manual typings:
    var typings = [
      'typings/browser.d.ts',
      'typings/vexflow.d.ts',
      'typings/fft.d.ts'
    ];
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
                src: typings.concat(['src/**/*.ts']),
                dest: '<%= outputDir.build %>/osmd.js',
                options: {
                    banner: "<%= banner %>"
                }
            },
            debug: {
                src: typings.concat([
                    'src/Common/**/*.ts', 'test/Common/**/*.ts',
                    'src/Util/**/*.ts', 'test/Util/**/*.ts'
                    // Should be: 'src/**/*.ts', 'test/**/*.ts'
                ]),
                dest: '<%= outputDir.build %>/osmd-debug.js',
                options: {
                    banner: "<%= banner %>",
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
        // CI setup
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
                src: ['src/**/*.ts', 'test/**/*.ts']
            }
        },
        // TypeScript Type Definitions
        typings: {
            install: {}
        },
        //
        docco: {
            src: ['src/**/*.ts'],
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
                    '.tscache',
                    'src/**/*.js', 'test/**/*.js'
                ]
            }
        }
    });

    // Load Npm tasks
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    // grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-tslint');
    grunt.loadNpmTasks('grunt-typings');

    // Register tasks
    grunt.registerTask('all', ['typings', 'default']);
    grunt.registerTask('default', ['tslint', 'browserify', 'karma:ci']);
    // grunt.registerTask('lint', ['tslint', 'jscs']);
    grunt.registerTask('test', ['tslint', 'browserify:debug', 'karma:ci']);
    // grunt.registerTask('test debug Firefox', ['browserify:debug', 'karma:debugWithFirefox']);
    // grunt.registerTask('test debug Chrome', ['browserify:debug', 'karma:debugWithChrome']);
    grunt.registerTask('rebuild', ['clean', 'default']);
    grunt.registerTask('publish', ['clean', 'browserify:dist']);
};
