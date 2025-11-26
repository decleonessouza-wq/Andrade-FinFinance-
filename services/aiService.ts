import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

/**
 * Generates a response from Gemini, considering the user's financial context.
 */
export const sendMessageToAssistant = async (
  history: ChatMessage[],
  userMessage: string,
  financialContext: string
): Promise<string> => {
  try {
    const systemPrompt = `
      Você é o FinBot, o assistente virtual inteligente do aplicativo "AndradeFinance".
      
      SOBRE O APP:
      - O AndradeFinance é um hub de controle financeiro familiar.
      - Funcionalidades principais: Projeção de Saldo (prevê o futuro baseado em contas a pagar), Smart Input (categorização automática), Gestão de Cartão de Crédito (fatura atual vs próxima) e Metas.
      - O design é moderno e em tons de verde.
      
      SEU PAPEL:
      - Ajudar o usuário a navegar no app.
      - Fornecer conselhos financeiros baseados no contexto fornecido.
      - Explicar conceitos como "Fluxo de Caixa" ou "Reserva de Emergência".
      - Ser educado, motivador e conciso. Use emojis ocasionalmente.
      
      CONTEXTO FINANCEIRO ATUAL DO USUÁRIO:
      ${financialContext}
      
      Responda à pergunta do usuário considerando esse contexto. Se ele perguntar "Como estou esse mês?", use os números fornecidos.
      Não invente dados. Se não souber, sugira onde ver no app.
    `;

    // Map history to the format Gemini expects (if using chat, but for simple generateContent with context, we can just append)
    // For simplicity in this implementation, we will concatenate history into a single prompt block or use the chat structure if preferred.
    // Let's use a fresh generateContent call with the context + history to ensure stateless simplicity for now, 
    // or we can use a chat session if we wanted to maintain it. 
    // Given the constraints, a single robust prompt is often safer and stateless.

    let conversationLog = history.map(msg => `${msg.role === 'user' ? 'Usuário' : 'FinBot'}: ${msg.text}`).join('\n');

    const prompt = `
      ${systemPrompt}

      HISTÓRICO DA CONVERSA:
      ${conversationLog}
      
      Usuário: ${userMessage}
      FinBot:
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Desculpe, não consegui processar sua resposta no momento.";

  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Estou tendo dificuldades para conectar ao servidor de inteligência agora. Por favor, tente novamente mais tarde.";
  }
};