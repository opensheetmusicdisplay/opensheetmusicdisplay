var merge = require('webpack-merge')
var path = require('path')
var common = require('./webpack.common.js')

// var webpack = require('webpack')
// var Visualizer = require('webpack-visualizer-plugin')
// const MinifyPlugin = require('babel-minify-webpack-plugin')

module.exports = merge(common, {
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].debug.js',
        library: 'opensheetmusicdisplay',
        libraryTarget: 'umd'
    },
    optimization: {
        minimize: false
        // splitChunks: {
        //     chunks: 'all',
        //     name: false
        // }
    },
    mode: 'development',
    devtool: 'source-map', // inline-source-map makes the debug.js 7.5MB instead of 2.8MB
    plugins: [
        // build optimization plugins
        /*
        new webpack.LoaderOptionsPlugin({
            minimize: false,
            debug: false
        }),
        */

        /* useful size statistics, enable this temporarily to check where the size of the debug file comes from
        new Visualizer({
            path: path.resolve(__dirname, 'build'),
            filename: './statistics.html'
        }),
        */

        /*
        new MinifyPlugin(true, {
            exclude: './src/*'
        })
        */
    ]
})
