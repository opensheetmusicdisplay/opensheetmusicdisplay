var { merge } = require('webpack-merge')
var common = require('./webpack.common.js')
var webpack = require('webpack')

module.exports = merge(common, {
    devtool: 'inline-source-map',
    mode: 'development',
    plugins: [
        new webpack.EnvironmentPlugin({
            STATIC_FILES_SUBFOLDER: false, // Set to other directory if NOT using webpack-dev-server
            DEBUG: false,
            OSMD_DEBUG_CONTROLS: true, // unfortunately, cross-env doesn't seem enough to set this in the demo when using npm start
            OSMD_DEMO_TITLE: 'OpenSheetMusicDisplay Demo (Developer)',
            DRAW_BOUNDING_BOX_ELEMENT: false //  Specifies the element to draw bounding boxes for (e.g. 'GraphicalLabels'). If 'all', bounding boxes are drawn for all elements.
        })
    ]
})
