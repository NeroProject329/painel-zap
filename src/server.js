import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import ZapConfig from "./models/ZapConfig.js";
import requireAdmin from "./middlewares/requireAdmin.js";


const app = express();
app.use(express.json());

// 🔒 Rate limit no público
app.use("/api/", rateLimit({ windowMs: 60_000, max: 120 }));

// ✅ CORS: libera LPs + admin
// (por enquanto liberado geral; depois a gente coloca whitelist)
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"] // 👈 importante agora
}));

function normalizeDomain(raw) {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

function normalizePhone(raw) {
  return String(raw || "").replace(/\D/g, "");
}

// ==========================
// 🔐 AUTH (Login do Admin)
// ==========================
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { role: "ADMIN" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("Erro no login:", err);
    return res.status(500).json({ error: "Erro ao autenticar" });
  }
});




// ==========================
// ✅ PÚBLICO (LPs)
// ==========================
app.get("/api/zap", async (req, res) => {
  try {
    const domain = normalizeDomain(req.query.domain);
    if (!domain) return res.json({ numero: "" });

    const config = await ZapConfig.findOne({ domain });
    return res.json({ numero: config?.numero || "" });
  } catch (err) {
    console.error("Erro ao buscar zap:", err);
    res.status(500).json({ error: "Erro ao buscar número do WhatsApp" });
  }
});

// ==========================
// ✅ ADMIN (Painel)
// ==========================
app.post("/admin/save-zap", requireAdmin, async (req, res) => {
  try {
    const domain = normalizeDomain(req.body.domain);
    const numero = normalizePhone(req.body.numero);

    if (!domain) return res.status(400).json({ error: "domain obrigatório" });

    await ZapConfig.findOneAndUpdate(
      { domain },
      { numero, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ message: "Número atualizado com sucesso." });
  } catch (err) {
    console.error("Erro ao salvar zap:", err);
    res.status(500).json({ error: "Erro ao salvar número do WhatsApp" });
  }
});

app.delete("/admin/delete-zap", requireAdmin, async (req, res) => {
  try {
    const domain = normalizeDomain(req.body.domain);
    if (!domain) return res.status(400).json({ error: "domain obrigatório" });

    await ZapConfig.deleteOne({ domain });
    res.json({ message: "Config apagada com sucesso." });
  } catch (err) {
    console.error("Erro ao apagar zap:", err);
    res.status(500).json({ error: "Erro ao apagar número" });
  }
});

app.get("/admin/list-zap", requireAdmin, async (req, res) => {
  try {
    const list = await ZapConfig
      .find({}, { _id: 0, domain: 1, numero: 1 })
      .sort({ domain: 1 });

    res.json(list);
  } catch (err) {
    console.error("Erro ao listar zaps:", err);
    res.status(500).json({ error: "Erro ao listar domínios" });
  }
});

const PORT = process.env.PORT || 3000;

async function start() {
  await mongoose.connect(process.env.MONGO_URL);
  app.listen(PORT, () => console.log("API online na porta", PORT));
}

start();
