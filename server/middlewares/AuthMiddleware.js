import jwt from "jsonwebtoken";

// Use a consistent JWT key from environment variables
const JWT_KEY = process.env.JWT_KEY || "default_secret_key";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).send("You are not authenticated!");

  jwt.verify(token, JWT_KEY, async (err, payload) => {
    if (err) {
      console.error("Token verification error:", err);
      return res.status(403).send("Token is not valid!");
    }
    req.userId = payload?.userId;
    next();
  });
};
