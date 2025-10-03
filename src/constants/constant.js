export const accessTokenOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 24 * 60 * 60 * 1000, 
};

export const refreshTokenOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 10 * 24 * 60 * 60 * 1000, 
};

export const options = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 24 * 60 * 60 * 1000,
};