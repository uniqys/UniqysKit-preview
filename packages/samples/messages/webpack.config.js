const path = require('path')

module.exports = {
  mode: 'production',
  entry: './client',
  output: {
    path: path.join(__dirname, 'static'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        exclude: /node_modules/,
        loader: 'vue-loader',
      }
    ]
  },
  resolve: {
    extensions: [
      '.js',
      '.vue',
    ]
  }
}
