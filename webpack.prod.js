var merge = require('webpack-merge');
var webpack = require('webpack');
var path = require('path');
var common = require('./webpack.common.js');
var visualizerPlugin = require('webpack-visualizer-plugin');
var cleanerPlugin = require('clean-webpack-plugin');

var pathsToClean = [
    'dist/**',
    'build/**'
];

module.exports = merge(common, {
    output: {
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'build')
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            warnings: false,
            beautify: false,
            compress: true,
            comments: false,
            sourceMap: true,
            parallel: true
        }),
        // build optimization plugins
        new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: true
        }),
        new visualizerPlugin({            
            path: path.resolve(__dirname, 'build'),
            filename: './statistics.html'
        }),
        new cleanerPlugin(pathsToClean, {verbose: true, dry: false})
    ]
});