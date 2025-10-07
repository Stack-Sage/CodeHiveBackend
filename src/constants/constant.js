export const accessTokenOptions = {
  httpOnly: true,
  secure: true, // should be boolean, not string
  sameSite: 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000, 
};

export const options = {
  httpOnly: true,
  secure: true, // should be boolean, not string
  sameSite: 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};