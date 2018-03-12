var merge = require('webpack-merge')
var common = require('./webpack.common.js')

module.exports = merge(common, {
    devtool: process.env.DEBUG ? false : 'source-map'
})
