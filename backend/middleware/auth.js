// Member 1: implement JWT cookie auth (prd.md section 8).

// protect: read req.cookies.token, verify it with JWT_SECRET, load the user into req.user.
// Respond 401 if the token is missing or invalid.
export async function protect(req, res, next) {
  // TODO (Member 1)
  next();
}

// allow("admin"), allow("customer"), ...: respond 403 if req.user.role is not in roles.
export function allow(...roles) {
  return (req, res, next) => {
    // TODO (Member 1)
    next();
  };
}
