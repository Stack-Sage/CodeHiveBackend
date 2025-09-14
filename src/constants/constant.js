export const options = {
    httpOnly: true,
    secure: true,   // must be true in prod (HTTPS)
    sameSite: "lax", // required for cross-domain cookies
    maxAge: 24 * 60 * 60 * 1000,
  };