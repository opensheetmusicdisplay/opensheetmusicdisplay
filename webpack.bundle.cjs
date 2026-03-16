const path = require('path');

module.exports = {
    mode: 'production',
    entry: './build/dist/src/index.js',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'opensheetmusicdisplay.min.js',
        library: {
            type: 'module'
        },
        globalObject: 'this'
    },
    experiments: {
        outputModule: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                resolve: {
                    fullySpecified: false  // Disable the behavior
                }
            }
        ]
    },
    resolve: {
        extensions: ['.js'],
        fallback: {
            "fs": false,
            "path": false,
            "util": false
        }
    },
    optimization: {
        minimize: true
    }
};
