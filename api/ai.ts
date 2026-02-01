// api/ai.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

type ChatMessage = { role: "user" | "model"; text: string };

function normalizeHistory(history: ChatMessage[]) {
  const cleaned = [...(history || [])]
    .map((m) => ({
      role: m.role,
      parts: [{ text: (m.text || "").toString() }],
    }))
    .filter((m) => m.parts[0].text.trim().length > 0);

  // Gemini exige que o PRIMEIRO content seja role "user"
  while (cleaned.length && cleaned[0].role !== "user") cleaned.shift();
  return cleaned;
}

function extractTextFromResponse(resp: any): string {
  if (!resp) return "";
  if (typeof resp.text === "string") return resp.text;
  if (typeof resp.text === "function") return resp.text();

  const cand = resp.candidates?.[0];
  const parts = cand?.content?.parts;
  const text = parts?.map((p: any) => p?.text).filter(Boolean).join("\n");
  return text || "";
}

function safeJsonParse(body: any) {
  // Em alguns cenários, req.body pode vir como string
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

const SYSTEM_INSTRUCTION = `
Você é o Andrade Assistente, um assistente financeiro pessoal e familiar.
Regras:
- Responda em PT-BR.
- Seja prático, direto e cordial.
- Quando faltar dados, faça perguntas objetivas.
- Sugira passos e opções (orçamento, corte de gastos, dívidas, metas, reserva de emergência).
- Se envolver números, mostre o cálculo.
- Não invente informações do usuário. Use apenas o contexto fornecido.
`.trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS básico (útil para PWA / app instalado)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY não configurada no servidor. Configure nas variáveis de ambiente (ex: Vercel).",
      });
    }

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

    const body = safeJsonParse(req.body);

    const userText: string = (body.userText || "").toString();
    const context: string = (body.context || "").toString();
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    if (!userText.trim()) {
      return res.status(400).json({ error: "userText é obrigatório." });
    }

    const ai = new GoogleGenAI({ apiKey });

    const cleanedHistory = normalizeHistory(history);

    const prompt =
      (context?.trim()
        ? `Contexto do app (use como referência):\n${context.trim()}\n\n`
        : "") + `Pergunta do usuário:\n${userText}`;

    const contents = [
      ...cleanedHistory,
      { role: "user" as const, parts: [{ text: prompt }] },
    ];

    const resp = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 600,
      },
    });

    const text = extractTextFromResponse(resp)?.trim();

    return res.status(200).json({
      reply: text || "Não consegui gerar uma resposta agora. Tente novamente.",
    });
  } catch (err: any) {
    const msg =
      err?.message ||
      err?.toString?.() ||
      "Erro inesperado ao chamar o Gemini no servidor.";
    return res.status(500).json({ error: msg });
  }
}
