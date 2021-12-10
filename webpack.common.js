var path = require('path')
var HtmlWebpackPlugin = require('html-webpack-plugin')
var webpack = require('webpack')

module.exports = {
    entry: {
        opensheetmusicdisplay: './src/index.ts', // Main index (OpenSheetMusicDisplay and other classes)
        demo: './demo/index.js' // Demo index
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js',
        library: 'opensheetmusicdisplay',
        libraryTarget: 'umd',
        globalObject: 'this',
        // Set the publicPath to match the location of the chunk files.
        publicPath: './', 
        // TODO: The VexFlow ESM output will need to include the magic comments with webpackChunkName for this to work.
        chunkFilename: '[name].js' 
    },
    resolve: {
        // Add '.ts' and '.tsx' as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js'],
        alias: {
            // This imports the ESM version of VexFlow.
            // It maps "vexflow" to the "vexflow-core-with-gonville.js" entry file.
            vexflow: path.resolve(__dirname, "node_modules/vexflow/build/esm/entry/vexflow-core-with-gonville.js")
            
            // It is also possible to directly import the TS source files.
            // However, we might need to configure webpack loaders to make sure the
            // imports within those TS files are resolved properly.
            // vexflow: path.resolve(__dirname, 'node_modules/vexflow/entry/vexflow-core-with-gonville.ts'),
        },
    },
    module: {
        rules: [
            // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                // loader: 'awesome-typescript-loader',
                exclude: /(node_modules|bower_components)/
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery'
        }),
        new webpack.EnvironmentPlugin({
            STATIC_FILES_SUBFOLDER: false, // Set to other directory if NOT using webpack-dev-server
            DEBUG: false,
            DRAW_BOUNDING_BOX_ELEMENT: false //  Specifies the element to draw bounding boxes for (e.g. 'GraphicalLabels'). If 'all', bounding boxes are drawn for all elements.
        }),
        // add a demo page to the build folder
        new HtmlWebpackPlugin({
            template: 'demo/index.html',
            favicon: 'demo/favicon.ico',
            title: 'OpenSheetMusicDisplay Demo'
        })
    ],
    devServer: {
        static: [
            path.join(__dirname, 'test/data'),
            path.join(__dirname, 'build'),
            path.join(__dirname, 'demo')
        ],
        port: 8000,
        compress: false
    }
}
