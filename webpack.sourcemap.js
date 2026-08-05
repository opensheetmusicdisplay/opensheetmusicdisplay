var { merge } = require('webpack-merge')
var production = require('./webpack.prod.js')

// will create a build plus separate .min.js.map source map for debugging
module.exports = production.map(config => merge(config, { devtool: 'source-map' }))
