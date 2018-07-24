const base = require('../../config-base/jest.config')

module.exports = Object.assign(base, {
  coveragePathIgnorePatterns: [
    'src/nat-traversal/index.ts',
    'src/libp2p-bundle.ts',
  ]
})
