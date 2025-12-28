/**
 * Cookie configuration utilities
 * Handles environment-specific cookie settings
 */

// Only production uses basePath '/note', development uses root path
const isProduction = process.env.NODE_ENV === 'production'
const basePath = isProduction ? '/note' : '/'

/**
 * Standard cookie options for session management
 */
export const getSessionCookieOptions = (maxAge: number = 24 * 60 * 60) => ({
  httpOnly: true,
  secure: false, // TODO: Enable in production with HTTPS
  sameSite: 'strict' as const,
  maxAge,
  path: basePath,
})

/**
 * Cookie options for "remember me" functionality (7 days)
 */
export const getRememberMeCookieOptions = () => getSessionCookieOptions(7 * 24 * 60 * 60)

/**
 * Cookie options for session deletion (maxAge: 0)
 */
export const getDeleteCookieOptions = () => ({
  ...getSessionCookieOptions(),
  maxAge: 0,
})

/**
 * Get the base path for the current environment
 */
export const getBasePath = () => basePath
