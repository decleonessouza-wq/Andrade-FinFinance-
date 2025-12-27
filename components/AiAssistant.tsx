import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { sendMessageToAssistant, ChatMessage } from "../services/aiService";
import { calculateBalances, getAccounts, getCategories, getTransactions } from "../services/storageService";
import { AccountType, TransactionType } from "../types";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const AiAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Olá! Sou o **Andrade Assistente**. Posso te ajudar com orçamento, despesas, receitas e planejamento. Como posso ajudar hoje? 💸✅",
      createdAt: new Date().toISOString(),
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [context, setContext] = useState<string>("");

  const loadContext = async () => {
    try {
      const [balances, accounts, categories, txs] = await Promise.all([
        calculateBalances(),
        getAccounts(),
        getCategories(),
        getTransactions(),
      ]);

      const totalAccounts = accounts.length;
      const totalWallets = accounts.filter((a) => a.type !== AccountType.CREDIT_CARD).length;
      const totalCards = accounts.filter((a) => a.type === AccountType.CREDIT_CARD).length;

      const now = new Date();
      const monthTxs = txs.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const paidMonthIncome = monthTxs
        .filter((t) => t.isPaid && t.type === TransactionType.INCOME)
        .reduce((s, t) => s + t.value, 0);

      const paidMonthExpense = monthTxs
        .filter((t) => t.isPaid && t.type === TransactionType.EXPENSE)
        .reduce((s, t) => s + t.value, 0);

      const topCats = new Map<string, number>();
      monthTxs
        .filter((t) => t.isPaid && t.type === TransactionType.EXPENSE)
        .forEach((t) => topCats.set(t.categoryId, (topCats.get(t.categoryId) || 0) + t.value));

      const top3 = Array.from(topCats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([catId, value]) => {
          const name = categories.find((c) => c.id === catId)?.name || "Categoria";
          return `- ${name}: ${formatBRL(value)}`;
        });

      const lines: string[] = [];
      lines.push(`Resumo atual do app:`);
      lines.push(
        `- Contas/Carteiras cadastradas: ${totalAccounts} (Carteiras/contas: ${totalWallets} | Cartões: ${totalCards})`
      );
      lines.push(`- Saldo real (sem cartão): ${formatBRL(balances.realBalance)}`);
      lines.push(`- Saldo projetado (considerando cartão): ${formatBRL(balances.projectedBalance)}`);
      lines.push(`- Receitas pagas no mês: ${formatBRL(paidMonthIncome)}`);
      lines.push(`- Despesas pagas no mês: ${formatBRL(paidMonthExpense)}`);
      if (top3.length) {
        lines.push(`- Top despesas do mês:`);
        lines.push(...top3);
      }

      setContext(lines.join("\n"));
    } catch {
      setContext("");
    }
  };

  useEffect(() => {
    if (open) loadContext();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  // ✅ História para o modelo SEMPRE começa com USER
  const historyForModel = useMemo<ChatMessage[]>(() => {
    const last = messages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      text: m.text.replace(/\*\*/g, ""),
    }));

    const firstUserIndex = last.findIndex((m) => m.role === "user");
    if (firstUserIndex === -1) return []; // sem user => sem history
    return last.slice(firstUserIndex);
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setSending(true);
    setInput("");

    const userMsg: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    };

    // adiciona na UI primeiro
    setMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await sendMessageToAssistant(text, historyForModel, context);

      const assistantMsg: UiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      const msg =
        e?.message ||
        "Desculpe, estou tendo dificuldades técnicas no momento. Verifique sua conexão e tente novamente.";
      setError(msg);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Desculpe, estou tendo dificuldades técnicas no momento. Verifique sua conexão.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-40 rounded-full w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200 flex items-center justify-center transition-all"
        aria-label="Abrir Andrade Assistente"
        title="Andrade Assistente"
      >
        <Sparkles size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div
            className="
              absolute right-4 md:right-6 top-4 md:top-6 bottom-4 md:bottom-6
              w-[calc(100%-2rem)] md:w-[420px]
              bg-white rounded-3xl shadow-2xl border border-gray-200
              flex flex-col overflow-hidden
              animate-fade-in
            "
            role="dialog"
            aria-modal="true"
          >
            <div className="p-4 md:p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div className="leading-tight">
                  <div className="font-extrabold text-gray-900">Andrade Assistente</div>
                  <div className="text-xs text-emerald-600 font-semibold">Online</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
                title="Fechar"
              >
                <X className="text-gray-500" />
              </button>
            </div>

            {context && (
              <div className="px-4 md:px-5 py-3 bg-emerald-50/60 border-b border-emerald-100">
                <div className="text-[11px] text-emerald-900 font-bold mb-1">Contexto do app (auto)</div>
                <pre className="text-[11px] text-emerald-900/90 whitespace-pre-wrap leading-relaxed">{context}</pre>
              </div>
            )}

            <div
              ref={scrollRef}
              className="flex-1 p-4 md:p-5 overflow-y-auto space-y-3 bg-gradient-to-b from-white to-emerald-50/40"
            >
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`
                      max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                      ${m.role === "user" ? "bg-emerald-600 text-white" : "bg-white border border-gray-100 text-gray-800"}
                    `}
                  >
                    <span
                      dangerouslySetInnerHTML={{
                        __html: m.text
                          .replace(/</g, "&lt;")
                          .replace(/>/g, "&gt;")
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\n/g, "<br/>"),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="px-4 md:px-5 py-3 border-t border-gray-100 bg-red-50 text-red-700 text-sm flex items-start gap-2">
                <AlertTriangle size={18} className="mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            <div className="p-4 md:p-5 border-t border-gray-100 bg-white">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Pergunte sobre suas finanças..."
                  className="flex-1 px-4 py-3 rounded-2xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200 transition-all"
                  aria-label="Enviar"
                  title="Enviar"
                >
                  {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
              </div>
              <div className="text-[11px] text-gray-400 mt-2">
                Dica: peça “como cortar gastos”, “quanto guardar por mês”, “organize meu orçamento”.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiAssistant;
