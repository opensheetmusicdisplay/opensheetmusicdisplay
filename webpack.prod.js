const { merge } = require('webpack-merge');
var path = require('path')
var webpack = require('webpack')
var common = require('./webpack.common.js')
var Visualizer = require('webpack-visualizer-plugin2')

// the UMD library (build/opensheetmusicdisplay.min.js: script tag, require()) and the demo
const umd = merge(common, {
    name: 'umd',
    output: {
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'build'),
        library: 'opensheetmusicdisplay',
        libraryTarget: 'umd',
        // webpack 5 built-in cleanup, replaces clean-webpack-plugin.
        // keep statistics.html (emitted by webpack-visualizer-plugin2) across rebuilds.
        clean: {
            keep: /^statistics\.html/
        }
    },
    mode: 'production',
    optimization: {
        minimize: true
        // splitChunks: {
        //     chunks: 'all',
        //     name: false
        // }
    },
    plugins: [
        new Visualizer({
            path: path.resolve(__dirname, 'build'),
            filename: './statistics.html'
        })
    ]
})

/** The typings of the ES module, build/opensheetmusicdisplay.min.d.mts, which TypeScript finds next to the .min.mjs file.
 *  The d.ts files in build/dist/src are CommonJS typings (as the package has no "type": "module"), so the ES module
 *  gets a file of its own that passes them on and declares its default export (see src/index.esm.ts). */
const esmTypings = 'export * from "./dist/src/index.js";\n' +
    'import * as opensheetmusicdisplay from "./dist/src/index.js";\n' +
    'export default opensheetmusicdisplay;\n'

/** Writes the typings of the ES module into the build folder. */
class EsmTypingsPlugin {
    apply (compiler) {
        compiler.hooks.thisCompilation.tap('EsmTypingsPlugin', (compilation) => {
            compilation.hooks.processAssets.tap(
                { name: 'EsmTypingsPlugin', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
                () => compilation.emitAsset('opensheetmusicdisplay.min.d.mts', new webpack.sources.RawSource(esmTypings))
            )
        })
    }
}

// the same library as an ES module (build/opensheetmusicdisplay.min.mjs: import in Node, bundlers, <script type="module">),
//   the "import" condition of "exports" in package.json. Checked by npm run test:package.
const esm = {
    name: 'esm',
    dependencies: ['umd'], // built after the UMD library, whose build cleans the build folder and writes the d.ts files
    entry: {
        opensheetmusicdisplay: './src/index.esm.ts'
    },
    experiments: {
        outputModule: true
    },
    output: {
        filename: '[name].min.mjs',
        path: path.resolve(__dirname, 'build'),
        library: { type: 'module' }
    },
    mode: 'production',
    optimization: {
        minimize: true
    },
    resolve: common.resolve,
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                exclude: /(node_modules|bower_components)/,
                options: {
                    // the UMD build has type-checked the same files and written their d.ts files
                    transpileOnly: true,
                    compilerOptions: {
                        // webpack can only list the exports of an entry that is an ES module (tsconfig.json: commonjs)
                        module: 'esnext',
                        moduleResolution: 'bundler',
                        declaration: false,
                        rootDir: __dirname
                    }
                }
            }
        ]
    },
    plugins: [
        new EsmTypingsPlugin()
    ]
}

module.exports = [umd, esm]
// one build at a time: together they would need twice the memory
module.exports.parallelism = 1
