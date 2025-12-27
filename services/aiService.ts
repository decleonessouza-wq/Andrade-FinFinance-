// services/aiService.ts
import { GoogleGenAI } from "@google/genai";

export type ChatMessage = {
  role: "user" | "model";
  text: string;
};

// Lê do Vite env (frontend)
const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;

// Modelo padrão (você pode trocar via .env.local -> VITE_GEMINI_MODEL)
const MODEL =
  ((import.meta as any).env?.VITE_GEMINI_MODEL as string | undefined) || "gemini-2.0-flash";

function requireApiKey() {
  if (!API_KEY || !API_KEY.trim()) {
    throw new Error(
      "Chave Gemini não encontrada. Configure VITE_GEMINI_API_KEY no arquivo .env.local e reinicie o servidor."
    );
  }
}

function normalizeHistory(history: ChatMessage[]): { role: "user" | "model"; parts: { text: string }[] }[] {
  // Gemini exige que o PRIMEIRO content seja role "user".
  // Então removemos mensagens iniciais do tipo "model" (ex: boas-vindas).
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
  // SDK novo pode retornar estruturas diferentes; vamos extrair de forma robusta
  if (!resp) return "";
  if (typeof resp.text === "string") return resp.text;
  if (typeof resp.text === "function") return resp.text();

  const cand = resp.candidates?.[0];
  const parts = cand?.content?.parts;
  const text = parts?.map((p: any) => p?.text).filter(Boolean).join("\n");
  return text || "";
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
`;

export async function sendMessageToAssistant(
  userText: string,
  history: ChatMessage[] = [],
  context: string = ""
): Promise<string> {
  requireApiKey();

  const ai = new GoogleGenAI({ apiKey: API_KEY! });

  const cleanedHistory = normalizeHistory(history);

  const prompt =
    (context?.trim()
      ? `Contexto do app (use como referência):\n${context.trim()}\n\n`
      : "") + `Pergunta do usuário:\n${userText}`;

  const contents = [
    ...cleanedHistory,
    { role: "user" as const, parts: [{ text: prompt }] },
  ];

  try {
    const resp = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION.trim(),
        temperature: 0.7,
        maxOutputTokens: 600,
      },
    });

    const text = extractTextFromResponse(resp)?.trim();
    return text || "Não consegui gerar uma resposta agora. Tente novamente.";
  } catch (err: any) {
    // Erro mais legível
    const msg =
      err?.message ||
      err?.toString?.() ||
      "Falha ao chamar o Gemini. Verifique a chave e as permissões.";

    throw new Error(msg);
  }
}
