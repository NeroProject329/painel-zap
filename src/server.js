import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import ZapConfig from "./models/ZapConfig.js";
import adminAuth from "./middlewares/adminAuth.js";

const app = express();
app.use(express.json());

// 🔒 Rate limit no público
app.use("/api/", rateLimit({ windowMs: 60_000, max: 120 }));

// ✅ CORS: libera LPs + admin (você pode restringir depois)
app.use(cors({
  origin: (origin, cb) => cb(null, true), // depois a gente troca por whitelist
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "x-admin-secret"]
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

// ✅ Público: pega número do domínio
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

// ✅ Admin: salva número por domínio
app.post("/admin/save-zap", adminAuth, async (req, res) => {
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

// (opcional) Admin: apagar config de um domínio
app.delete("/admin/delete-zap", adminAuth, async (req, res) => {
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

const PORT = process.env.PORT || 3000;

async function start() {
  await mongoose.connect(process.env.MONGO_URL);
  app.listen(PORT, () => console.log("API online na porta", PORT));
}

start();
