var merge = require('webpack-merge')
var webpack = require('webpack')
var path = require('path')
var common = require('./webpack.common.js')
var Visualizer = require('webpack-visualizer-plugin')
var Cleaner = require('clean-webpack-plugin')

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
        minimize: true
        // splitChunks: {
        //     chunks: 'all',
        //     name: false
        // }
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
