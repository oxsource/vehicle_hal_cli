//webpack.config.js
import path from 'path';
import url from 'url';

export default {
  mode: 'production',
  entry: ['core-js/stable', 'regenerator-runtime/runtime', './src/bundle/index.js'],
  output: {
    path: path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), 'dist'),
    filename: 'bundle.cjs'
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    node: 'current',
                  },
                  useBuiltIns: 'entry',
                  corejs: 3,
                },
              ],
            ],
          },
        },
      },
    ],
  },
  resolve: {
    fallback: {
      fs: false,
      path: false,
    },
  },
}