import commandExportsMatchingFilename from './command-exports-matching-filename.js'
import noFixedSleepInTests from './no-fixed-sleep-in-tests.js'
import noThinDelegateWrappers from './no-thin-delegate-wrappers.js'

export default {
  meta: { name: 'dust' },
  rules: {
    'command-exports-matching-filename': commandExportsMatchingFilename,
    'no-fixed-sleep-in-tests': noFixedSleepInTests,
    'no-thin-delegate-wrappers': noThinDelegateWrappers,
  },
}
