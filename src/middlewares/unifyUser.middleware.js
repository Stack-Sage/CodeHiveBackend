export const unifyUser = (req, _res, next) => {
  // Prefer any previously authenticated principal, normalize to req.user
  if (!req.user && (req.student || req.teacher)) {
    req.user = req.student || req.teacher;
  }
  // Ensure role persists if present on any source
  if (req.user) {
    req.user.role = req.user.role || req.student?.role || req.teacher?.role;
  }
  // Remove legacy fields to enforce a single principal
  delete req.student;
  delete req.teacher;

  next();
};
