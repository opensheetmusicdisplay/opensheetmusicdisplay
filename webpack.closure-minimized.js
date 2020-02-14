var merge = require('webpack-merge')
var webpack = require('webpack')
var path = require('path')
var common = require('./webpack.common.js')
var Visualizer = require('webpack-visualizer-plugin')
var Cleaner = require('clean-webpack-plugin')
// var TerserPlugin = require('terser-webpack-plugin')
var ClosurePlugin = require('closure-webpack-plugin')

var pathsToClean = [
    'dist/**',
    'build/**'
]

module.exports = merge(common, {
    output: {
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'build'),
        library: 'opensheetmusicdisplay',
        libraryTarget: 'umd'
    },
    mode: 'production',
    optimization: {
        minimizer: [
            new ClosurePlugin({ mode: 'STANDARD' }, { // takes a lot of time; AGGRESSIVE_BUNDLE should save even more space, but causes errors.
                // compiler flags here
                //
                // for debugging help, try these:
                //
                // formatting: 'PRETTY_PRINT'
                // debug: true,
                // renaming: false
            })
        ]
        /* minimizer: [ // TerserPlugin hardly causes any size reduction at all, unfortunately
            new TerserPlugin({
                cache: true,
                parallel: true,
                sourceMap: false, // Must be set to true if using source-maps in production
                terserOptions: {
                // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
                }
            })
        ] */
    },
    plugins: [
        // build optimization plugins
        new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: true
        }),
        new Visualizer({
            path: path.resolve(__dirname, 'build'),
            filename: './statistics.html'
        }),
        new Cleaner(pathsToClean, { verbose: true, dry: false })
    ]
})
