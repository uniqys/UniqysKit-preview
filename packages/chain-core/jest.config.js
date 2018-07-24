const base = require('../../config-base/jest.config')

module.exports = Object.assign(base, {
  coveragePathIgnorePatterns: [
    // TODO: I will test it after the protocol settle.
    'src/node.ts',
    'src/validator.ts',
    'src/synchronizer.ts'
  ]
})
