import jwt from "jsonwebtoken";

export default function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  // Verifica se veio o header Authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Valida o token
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
