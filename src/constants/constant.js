export const accessTokenOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: process.env.COOKIE_SAME_SITE || 'none',
  maxAge: 24 * 60 * 60 * 1000, 
};



export const options = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: process.env.COOKIE_SAME_SITE || 'none',
  maxAge: 24 * 60 * 60 * 1000,
};