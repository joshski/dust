export function isErrnoException(
  error: unknown
): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  )
}

export function isErrorCode(error: unknown, code: string): boolean {
  return isErrnoException(error) && error.code === code
}
