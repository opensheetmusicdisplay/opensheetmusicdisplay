var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: {
    'osmd': './src/OSMD/OSMD.ts', // Main library
    'demo': './demo/index.js' // Demo index
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
           { test: /\.tsx?$/, loader: 'ts-loader' },
           // all files with a '.js' extension. Mostly for the web demo.
           { test: /\.jsx?$/, loader: 'babel-loader', exclude: /(node_modules|bower_components)/,
              query: {
                presets: ['es2015'] 
              }
          },
       ]
   },
   plugins: [
     // build optimization plugins
     new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: true
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    }),
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development', // use 'development' unless process.env.NODE_ENV is defined
      DEBUG: false,
      DRAW_BOUNDING_BOXES: '0',
      BOUNDING_BOX_TYPE: 'GraphicalLabel', // Set to undefined for all bounding boxes othwise put in the name of the object
    }),
    // FIXME: use environment variable to control uglify.
    // new webpack.optimize.UglifyJsPlugin({
    //     warnings: false,
    //     beautify: false,
    //     compress: true,
    //     comments: false,
    //     sourceMap: true
    //   })
  ],
  devServer: {
    contentBase: [
      path.join(__dirname, 'test/data'),
      path.join(__dirname, 'build'),
      path.join(__dirname, 'demo')
      // TODO: fill in paths for demo data
    ],
    port: 8000,
    compress: false,
  },
};
