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
        globalObject: 'this'
    },
    resolve: {
        // Add '.ts' and '.tsx' as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js'],
        alias: {
            vexflow: path.resolve(__dirname, 'external/vexflow/build/esm/entry/vexflow.js'),
            'structured-clone-es.js': path.resolve(__dirname, 'node_modules/structured-clone-es/dist/index.mjs')
        }
    },
    module: {
        rules: [
            // treat vexflow ESM build as auto module (handles missing .js extensions in imports)
            {
                test: /\.js$/,
                include: [path.resolve(__dirname, 'external/vexflow/build/esm')],
                type: 'javascript/auto',
                resolve: {
                    fullySpecified: false,
                },
            },
            // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                // loader: 'awesome-typescript-loader',
                exclude: /(node_modules|bower_components)/
            },
            {
                test: /\.glsl$/,
                type: "asset/source",
                exclude: /(node_modules|bower_components)/
            }
        ]
    },
    plugins: [
        new webpack.EnvironmentPlugin({
            STATIC_FILES_SUBFOLDER: false, // Set to other directory if NOT using webpack-dev-server
            DEBUG: false,
            DRAW_BOUNDING_BOX_ELEMENT: false //  Specifies the element to draw bounding boxes for (e.g. 'GraphicalLabels'). If 'all', bounding boxes are drawn for all elements.
        }),
        // add a demo page to the build folder
        new HtmlWebpackPlugin({
            template: 'demo/index.html',
            favicon: 'demo/favicon.ico',
            title: 'OSMD Demo'
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
