import { declare } from '@babel/helper-plugin-utils'
import { MAGIC_KEY, MAGIC_VALUE } from './constants'

export default declare(api => {
  api.assertVersion(7)

  return {
    visitor: {
      Program: {
        enter () {
          if (typeof this.opts.onComplete !== 'function') {
            throw new Error('onComplete option must be a function')
          }

          this.result = null
        },
        exit () {
          this.opts.onComplete(this.result)
        }
      },
      ObjectProperty (path) {
        const { node } = path
        if (!node.computed && path.get('key').isIdentifier({ name: MAGIC_KEY })) {
          const magicValue = path.get('value').evaluate()
          if (!magicValue.confident || magicValue.value !== MAGIC_VALUE) {
            return
          }

          const covScope = path.scope.getFunctionParent() ||
            /* istanbul ignore next: TODO determine why this fallback exists */
            path.scope.getProgramParent()
          const result = {}
          for (const key of ['path', 'hash', 'gcv', 'coverageData']) {
            const binding = covScope.getOwnBinding(key)
            if (!binding) {
              return
            }
            const valuePath = binding.path.get('init')
            const value = valuePath.evaluate()
            if (!value.confident) {
              return
            }
            result[key] = value.value
          }

          delete result.coverageData[MAGIC_KEY]
          delete result.coverageData.hash
          this.result = result
          path.stop()
        }
      }
    }
  }
})
