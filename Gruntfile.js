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
        ];

    // Paths
    var src = ['src/**/*.ts'];
    var test = ['test/**/*.ts'];

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
                src: ['src/OSMD/OSMD.ts'],
                dest: '<%= outputDir.build %>/osmd.js',
                options: {
                    banner: '<%= banner %>',
                    browserifyOptions: {
                        standalone: 'opensheetmusicdisplay'
                    }
                }
            },
            debug: {
                src: ['src/OSMD/OSMD.ts'],
                dest: '<%= outputDir.build %>/osmd-debug.js',
                options: {
                    banner: '<%= banner %>',
                    browserifyOptions: {
                        debug: true,
                        standalone: 'opensheetmusicdisplay'
                    }
                }
            },
            test: {
                src: [].concat(typings, src, test),
                dest: '<%= outputDir.build %>/osmd-test.js',
                options: {
                    banner: '<%= banner %>',
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
                    'drop_console': true
                },
                banner: banner,
                mangle: true,
                mangleProperties: true
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
            firefox: {
                configFile: 'karma.conf.js',
                options: {
                    singleRun: false,
                    browsers: ['Firefox']
                }
            },
            chrome: {
                configFile: 'karma.conf.js',
                options: {
                    singleRun: false,
                    browsers: ['Chrome']
                }
            }
        },
        // Typescript compilation for ES6 module (npm package)
        ts: {
          default : {
            tsconfig: true
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
                    'src/**/*.js', 'test/**/*.js' // if something went wrong, delete JS from TypeScript source directories
                ]
            }
        },
        copy: {
            demo: {
                files: [
                    { src: ['*'], dest: '<%= outputDir.build %>/demo/sheets/', cwd: './test/data/', expand: true },
                    { src: ['*.js', '*.css', '*.html', '*.ico'], cwd: './demo/', expand: true, dest: '<%= outputDir.build %>/demo/' },
                    { src: ['osmd-debug.js'], cwd: './build/', expand: true, dest: '<%= outputDir.build %>/demo/' }
                ]
            }
        },
        // http-server
        'http-server': {
            'demo': {
                root: 'build/demo',
                port: 8000,
                host: '0.0.0.0',
                showDir : true,
                autoIndex: true,
                runInBackground: false,
                openBrowser : true
            }
        }

    });

    // Load npm tasks
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-http-server');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-ts');

    // Build tasks
    grunt.registerTask('build:demo',  'Builds the demo.',                            ['browserify:debug', 'copy:demo']);
    grunt.registerTask('build:test',  'Builds the tests',                            ['browserify:test']);
    grunt.registerTask('build:dist',  'Builds for distribution on npm and Bower.',   ['browserify:dist', 'uglify', 'ts']);

    // Tests
    grunt.registerTask('test',        'Runs unit, regression and e2e tests.',        ['build:test', 'karma:ci']);

    // Default task (if grunt is run without any argument, used in contiuous integration)
    grunt.registerTask('default',     'Default task, running all other tasks. (CI)', ['test', 'build:demo', 'build:dist']);
};
