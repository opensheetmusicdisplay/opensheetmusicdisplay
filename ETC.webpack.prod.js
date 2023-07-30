const { merge } = require('webpack-merge');
var webpack = require('webpack')
var path = require('path')
var common = require('./ETC.webpack.common.js')
var Visualizer = require('webpack-visualizer-plugin2')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
// eslint-disable-next-line @typescript-eslint/typedef
const CopyPlugin = require("copy-webpack-plugin");

module.exports = merge(common, {
    output: {
        filename: "[name].min.js",
        path: path.resolve(__dirname, "ETC-build"),
        library: "opensheetmusicdisplay",
        libraryTarget: "umd"
    },
    mode: "production",
    optimization: {
        minimize: true
        // splitChunks: {
        //     chunks: 'all',
        //     name: false
        // }
    },
    plugins: [
        // build optimization plugins
        new CleanWebpackPlugin({
            verbose: false,
            dry: false,
            cleanOnceBeforeBuildPatterns: ["**/*", "!statistics.html*"]
        }),
        new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: true
        }),
        new Visualizer({
            path: path.resolve(__dirname, "ETC-build"),
            filename: "./statistics.html",
        }),
        new CopyPlugin({
            patterns: [
                { from: path.resolve(__dirname, "test/data"), to: path.resolve(__dirname, "ETC-build/sheets")},
            ],
        }),
    ]
})
