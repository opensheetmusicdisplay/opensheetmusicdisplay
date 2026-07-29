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
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
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
            // demo must be served before build: build/ holds copies of demo assets (demo.css etc.)
            //   from the last npm run build -- possibly of another branch -- which would otherwise
            //   shadow the live demo/ files under webpack-dev-server (first static dir match wins).
            // samples are additionally served under /samples to match the hosted demo layout
            //   (demo/index.js sampleFolder = "samples/", see hosted braille demo).
            { directory: path.join(__dirname, 'test/data'), publicPath: '/samples' },
            path.join(__dirname, 'test/data'),
            path.join(__dirname, 'demo'),
            path.join(__dirname, 'build')
        ],
        port: 8000,
        compress: false
    }
}
