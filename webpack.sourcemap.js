var merge = require('webpack-merge')
var common = require('./webpack.common.js')

// will create a build plus separate .min.js.map source map for debugging
module.exports = merge(common, {
    devtool: 'source-map',
    mode: 'development'
})
