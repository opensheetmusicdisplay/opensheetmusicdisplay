var { merge } = require('webpack-merge')
var common = require('./webpack.common.js')
var webpack = require('webpack')

module.exports = merge(common, {
    devtool: 'inline-source-map',
    mode: 'development',
})
