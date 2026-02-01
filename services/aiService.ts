// services/aiService.ts

export type ChatMessage = {
  role: "user" | "model";
  text: string;
};

// ===== CONFIG =====

// Chave local (DEV). Em produção/PWA não confie nisso.
const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;

// Modelo padrão (se usar chamada direta no DEV)
const MODEL =
  ((import.meta as any).env?.VITE_GEMINI_MODEL as string | undefined) || "gemini-2.0-flash";

/**
 * Proxy (backend) - recomendado.
 * Em produção (PWA), usamos proxy por padrão, pois .env.local não existe no app instalado.
 *
 * Você pode sobrescrever:
 * - VITE_AI_PROXY_URL="https://seu-dominio.com/api/ai"
 * - VITE_AI_USE_PROXY="true" para forçar proxy também no DEV
 */
const ENV_PROXY_URL = (import.meta as any).env?.VITE_AI_PROXY_URL as string | undefined;

// ✅ Padrão seguro: URL absoluta (evita bugs em PWA/base path)
const DEFAULT_PROXY_URL =
  typeof window !== "undefined" ? `${window.location.origin}/api/ai` : "/api/ai";

const PROXY_URL = (ENV_PROXY_URL && ENV_PROXY_URL.trim()) ? ENV_PROXY_URL.trim() : DEFAULT_PROXY_URL;

const FORCE_PROXY =
  (((import.meta as any).env?.VITE_AI_USE_PROXY as string | undefined) || "").toLowerCase() ===
  "true";

// Em PROD (build/PWA), usamos proxy automaticamente.
// Em DEV, usa proxy apenas se VITE_AI_USE_PROXY=true.
const USE_PROXY = Boolean((import.meta as any).env?.PROD) || FORCE_PROXY;

// ===== HELPERS =====

function extractReplyFromApi(data: any): string {
  const reply =
    data?.reply ||
    data?.text ||
    data?.response ||
    (typeof data === "string" ? data : "");

  return String(reply || "").trim();
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

// ===== PROXY CALL (RECOMENDADO) =====

async function sendViaProxy(payload: {
  userText: string;
  history: ChatMessage[];
  context?: string;
}): Promise<string> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // tenta ler json mesmo em erro
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      `Falha ao chamar o proxy do assistente (${res.status}).`;

    // Ajuda MUITO a diagnosticar PWA: mostra qual URL foi chamada
    throw new Error(`${msg} (URL: ${PROXY_URL})`);
  }

  const reply = extractReplyFromApi(data);
  if (!reply) {
    throw new Error(`Proxy retornou resposta vazia. (URL: ${PROXY_URL})`);
  }

  return reply;
}

// ===== DIRECT GEMINI CALL (DEV ONLY) =====

function requireApiKeyForDirect() {
  if (!API_KEY || !API_KEY.trim()) {
    throw new Error(
      "Chave Gemini não encontrada no frontend. No app instalado (PWA/produção) isso é esperado. " +
        "Use o proxy do assistente (/api/ai) ou force proxy no DEV com VITE_AI_USE_PROXY=true."
    );
  }
}

function normalizeHistory(history: ChatMessage[]): { role: "user" | "model"; parts: { text: string }[] }[] {
  const cleaned = [...(history || [])]
    .map((m) => ({
      role: m.role,
      parts: [{ text: (m.text || "").toString() }],
    }))
    .filter((m) => m.parts[0].text.trim().length > 0);

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

async function sendDirectGemini(
  userText: string,
  history: ChatMessage[] = [],
  context: string = ""
): Promise<string> {
  // ✅ Import dinâmico: não “puxa” o SDK pro bundle de produção
  const { GoogleGenAI } = await import("@google/genai");

  requireApiKeyForDirect();

  const ai = new GoogleGenAI({ apiKey: API_KEY! });

  const cleanedHistory = normalizeHistory(history);

  const prompt =
    (context?.trim()
      ? `Contexto do app (use como referência):\n${context.trim()}\n\n`
      : "") + `Pergunta do usuário:\n${userText}`;

  const contents = [...cleanedHistory, { role: "user" as const, parts: [{ text: prompt }] }];

  const resp = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      maxOutputTokens: 600,
    },
  });

  const text = extractTextFromResponse(resp)?.trim();
  return text || "Não consegui gerar uma resposta agora. Tente novamente.";
}

// ===== PUBLIC API =====

export async function sendMessageToAssistant(
  userText: string,
  history: ChatMessage[] = [],
  context: string = ""
): Promise<string> {
  try {
    // ✅ Em produção/PWA: proxy obrigatório por padrão
    if (USE_PROXY) {
      return await sendViaProxy({ userText, history, context });
    }

    // ✅ Em DEV: mantém a chamada direta (se a chave existir)
    // Se quiser forçar proxy no DEV: VITE_AI_USE_PROXY=true
    return await sendDirectGemini(userText, history, context);
  } catch (err: any) {
    const msg =
      err?.message ||
      err?.toString?.() ||
      "Falha ao chamar o assistente. Verifique sua conexão e configurações.";
    throw new Error(msg);
  }
}
