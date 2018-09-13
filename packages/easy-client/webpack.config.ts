import path from 'path'
const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin

module.exports = {
  mode: 'development',
  resolve: {
    extensions: [ '.ts', '.js' ]
  },
  entry: path.resolve(__dirname, 'webpack', 'index.ts'),
  output: {
    path: path.resolve(__dirname, 'lib'),
    pathinfo: false,
    filename: 'easy.js',
    library: 'Easy',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader',
        options: {
          configFileName: 'tsconfig.webpack.json'
        }
      }
    ]
  },
  plugins: [
    new LicenseWebpackPlugin({
      pattern: /.*/,
      unacceptablePattern: /GPL/,
      abortOnUnacceptableLicense: true,
      modulesDirectories: ['../../node_modules'], // hoisted
      perChunkOutput: false,
      addBanner: true
    })
  ]
}
