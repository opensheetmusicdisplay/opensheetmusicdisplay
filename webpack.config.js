const path = require('path');
const webpack = require('webpack');

module.exports = {
  // entry: [
  //   './src/OSMD/OSMD.ts'
  //   // TODO: Add demo.js where the webdev server is implemented
  //   //
  // ],
  entry: {
    'osmd': './src/OSMD/OSMD.ts',
    'demo': './demo/demo.js'
  },
  output: {
      path: path.resolve(__dirname, 'build'),
      filename: '[name].js',
   },
   resolve: {
       // Add '.ts' and '.tsx' as a resolvable extension.
       extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js']
   },
   module: {
       loaders: [
           // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
           { test: /\.tsx?$/, loader: 'ts-loader' }
       ]
   },
   plugins: [
     // build optimization plugins
     new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }),
    new webpack.optimize.UglifyJsPlugin({
        warnings: false,
        beautify: false,
        compress: true,
        comments: false,
        sourceMap: true
      })
  ],
  devServer: {
    contentBase: [
      path.join(__dirname, 'test/data'),
      path.join(__dirname, 'demo')
      // TODO: fill in paths for demo data
    ],
    port: 8000,
    compress: false,
  },
};
