export const accessTokenOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 24 * 60 * 60 * 1000, 
};

export const refreshTokenOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 10 * 24 * 60 * 60 * 1000, 
};

export const options = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 24 * 60 * 60 * 1000,
};