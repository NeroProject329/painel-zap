export default function adminAuth(req, res, next) {
  const secret = req.header("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}