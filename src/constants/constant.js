export const accessTokenOptions = {
  httpOnly: true,
  secure: false, // should be boolean, not string
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, 
};

export const options = {
  httpOnly: true,
  secure: false, // should be boolean, not string
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};