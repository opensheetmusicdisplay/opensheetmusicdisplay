const { merge } = require('webpack-merge');
var path = require('path')
var common = require('./webpack.common.js')
var Visualizer = require('webpack-visualizer-plugin2')

module.exports = merge(common, {
    output: {
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'build'),
        library: 'opensheetmusicdisplay',
        libraryTarget: 'umd',
        // webpack 5 built-in cleanup, replaces clean-webpack-plugin.
        // keep statistics.html (emitted by webpack-visualizer-plugin2) across rebuilds.
        clean: {
            keep: /^statistics\.html/
        }
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
        new Visualizer({
            path: path.resolve(__dirname, 'build'),
            filename: './statistics.html'
        })
    ]
})
