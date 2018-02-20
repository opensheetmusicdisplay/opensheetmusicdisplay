var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
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
           { 
              test: /\.tsx?$/, 
              loader: 'ts-loader' 
            },
           // all files with a '.js' extension. Mostly for the web demo.
           { 
              test: /\.jsx?$/, 
              loader: 'babel-loader', 
              exclude: /(node_modules|bower_components)/,
              query: {
                presets: ['es2015'] 
              }
            },
            // ts lint loader. will pre-lint the ts files
            {
              test: /\.ts$/,
              enforce: 'pre',
              loader: 'tslint-loader',
              options: { /* Loader options go here */ }
          },
          // For html loader generation
          {
            test: /\.html$/,
            loader: 'underscore-template-loader'
          },
          {
              test: /\.(jpg|jpeg|gif|png|ico)$/,
              exclude: /node_modules/,
              loader:'file-loader?name=img/[path][name].[ext]&context=./app/images'
          }
       ]
   },   
   plugins: [     
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    }),
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development', // use 'development' unless process.env.NODE_ENV is defined
      DEBUG: false,
      DRAW_BOUNDING_BOX_ELEMENT: false, //  Specifies the element to draw bounding boxes for (e.g. 'GraphicalLabels'). If 'all', bounding boxes are drawn for all elements.
    }),
    // add a demo page to the build folder
    new HtmlWebpackPlugin({
      template: 'demo/index.html',
      title: 'OpenSheetMusicDisplay Demo',
    }),
  ],
  devServer: {
    contentBase: [
      path.join(__dirname, 'test/data'),
      path.join(__dirname, 'build'),
      path.join(__dirname, 'demo')
    ],
    port: 8000,
    compress: false,
  },
};