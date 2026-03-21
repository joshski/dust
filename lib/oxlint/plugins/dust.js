import commandExportsMatchingFilename from './command-exports-matching-filename.js'
import noThinDelegateWrappers from './no-thin-delegate-wrappers.js'

export default {
  meta: { name: 'dust' },
  rules: {
    'command-exports-matching-filename': commandExportsMatchingFilename,
    'no-thin-delegate-wrappers': noThinDelegateWrappers,
  },
}
