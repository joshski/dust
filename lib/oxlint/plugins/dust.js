import commandExportsMatchingFilename from './command-exports-matching-filename.js'

export default {
  meta: { name: 'dust' },
  rules: {
    'command-exports-matching-filename': commandExportsMatchingFilename,
  },
}
