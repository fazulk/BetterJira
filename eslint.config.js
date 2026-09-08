import antfu from '@antfu/eslint-config'
import * as stylex from '@stylexjs/eslint-plugin'

export default antfu({
  vue: true,
  stylistic: true,
}, {
  files: ['**/*.{ts,tsx}'],
  plugins: { '@stylexjs': stylex },
  rules: {
    '@stylexjs/valid-styles': 'error',
    '@stylexjs/valid-shorthands': 'error',
    '@stylexjs/no-unused': 'error',
  },
})
