import React, { useEffect, useState } from 'react';
import { getExpensesByCategory, getMonthlyHistory } from '../services/storageService';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  Download,
  FileText,
  ArrowDownCircle,
  Wallet,
  CalendarRange
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const ReportsView: React.FC = () => {
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [range, setRange] = useState(6); // Padrão: 6 meses
  const [loading, setLoading] = useState(true);

  // CORREÇÃO PRINCIPAL: Carregamento Assíncrono com verificação de segurança
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Aguarda os dados chegarem do Firebase (Promise.all para ser mais rápido)
        const [cats, hist] = await Promise.all([
          getExpensesByCategory(range),
          getMonthlyHistory(range)
        ]);

        // Verifica se recebeu arrays válidos antes de salvar no estado
        setCategoryData(Array.isArray(cats) ? cats : []);
        setHistoryData(Array.isArray(hist) ? hist : []);
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
        // Em caso de erro, define como vazio para não travar a tela
        setCategoryData([]);
        setHistoryData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [range]);

  // Cálculos Seguros (Verifica se é array antes de rodar o reduce)
  const safeHistory = Array.isArray(historyData) ? historyData : [];
  const safeCategories = Array.isArray(categoryData) ? categoryData : [];

  const totalIncome = safeHistory.reduce((acc, curr) => acc + (curr.income || 0), 0);
  const totalExpense = safeHistory.reduce((acc, curr) => acc + (curr.expense || 0), 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  const topCategory = safeCategories.length > 0 ? safeCategories[0].name : '-';

  // Função de Exportar CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Mes/Ano,Receitas,Despesas,Saldo\n";

    safeHistory.forEach(row => {
      const saldo = row.income - row.expense;
      csvContent += `${row.name},${row.income.toFixed(2)},${row.expense.toFixed(2)},${saldo.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_financeiro_${range}meses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função de Exportar PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório Financeiro - Andrade Finance", 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: Últimos ${range} meses`, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 33);

    // Resumo
    autoTable(doc, {
      startY: 40,
      head: [['Resumo', 'Valor']],
      body: [
        ['Receita Total', `R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Despesa Total', `R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Saldo Líquido', `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Economia', `${savingsRate.toFixed(1)}%`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105] }
    });

    // Detalhes
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text("Histórico Mensal", 14, finalY);

    const tableData = safeHistory.map(item => [
      item.name,
      `R$ ${item.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${item.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${(item.income - item.expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Mês', 'Receita', 'Despesa', 'Saldo']],
      body: tableData,
      theme: 'grid'
    });

    doc.save(`relatorio_${range}meses.pdf`);
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Gerando relatórios...</div>;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios Detalhados</h1>
          <p className="text-gray-500 text-sm">Análise de performance dos últimos {range} meses</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <Download size={16} /> <span>CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm transition-colors"
          >
            <FileText size={16} /> <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-brand-200 transition-all">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <TrendingUp size={18} />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Economia</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{savingsRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-400">da renda poupada</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-brand-200 transition-all">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Wallet size={18} />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Saldo Líquido</span>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
            R$ {balance.toLocaleString('pt-BR', { compactDisplay: "short", maximumFractionDigits: 0 } as any)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-brand-200 transition-all">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <ArrowDownCircle size={18} />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Maior Gasto</span>
          </div>
          <p className="text-lg font-bold text-gray-800 truncate" title={topCategory}>
            {topCategory}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-brand-200 transition-all">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              <CalendarRange size={18} />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">Período</span>
          </div>

          {/* ✅ A11Y FIX: label acessível para o select */}
          <label htmlFor="reportRange" className="sr-only">
            Selecionar período do relatório
          </label>

          <select
            id="reportRange"
            aria-label="Selecionar período do relatório"
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer w-full hover:text-brand-600 transition-colors"
          >
            <option value={3}>3 Meses</option>
            <option value={6}>6 Meses</option>
            <option value={12}>1 Ano</option>
          </select>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Barras */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Evolução Mensal</h3>
          {safeHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={safeHistory} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={5} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(val) => `R$${val / 1000}k`}
                />
                <RechartsTooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 mt-20">Sem dados suficientes para o período.</p>
          )}
        </div>

        {/* Gráfico de Pizza */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Gastos por Categoria</h3>
          {safeCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={safeCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {safeCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 mt-20">Nenhuma despesa registrada.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
