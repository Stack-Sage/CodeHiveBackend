import { ApiError } from "../utils/ApiError.js";

export const roleGuard = (...allowedRoles) => (req, res, next) => {
  const role = req.user?.role;
  if (!role) return next(new ApiError(401, "Unauthorized"));
  if (allowedRoles.length === 0 || allowedRoles.includes(role)) return next();
  return next(new ApiError(403, "Forbidden"));
};
