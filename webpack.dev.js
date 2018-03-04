var merge = require('webpack-merge')
var common = require('./webpack.common.js')

module.exports = merge(common, {
    devtool: process.env.DEBUG ? false : 'source-map',
    module: {
        loaders: [
            // Loading of 3rd party sourcemaps e.g. vexflow
            {
                test: /\.js$/,
                use: ['source-map-loader'],
                enforce: 'pre'
            }
        ]
    }
})
