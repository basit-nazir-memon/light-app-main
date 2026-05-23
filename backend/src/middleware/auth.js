import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "yova-auto-local-dev-secret";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
