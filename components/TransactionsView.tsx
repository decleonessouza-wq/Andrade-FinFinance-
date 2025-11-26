import React, { useEffect, useState } from 'react';
import { Transaction, Category, Account, TransactionType } from '../types';
import { getTransactions, getCategories, getAccounts } from '../services/storageService';
import { 
  FileText, 
  Search, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar, 
  Edit2, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  Filter,
  ChevronDown,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface TransactionsViewProps {
  onEditTransaction: (tx: Transaction) => void;
}

const TransactionsView: React.FC<TransactionsViewProps> = ({ onEditTransaction }) => {
  // --- ESTADOS DE DADOS ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE FILTRO E BUSCA ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  
  // --- ESTADO DE PAGINAÇÃO (Opcional para listas longas) ---
  const [displayLimit, setDisplayLimit] = useState(20);

  // --- CARREGAMENTO DOS DADOS (BLINDADO PARA FIREBASE) ---
  useEffect(() => {
    const loadData = async () => {
       setLoading(true);
       try {
         // Busca todas as coleções necessárias em paralelo
         const [txsData, catsData, accsData] = await Promise.all([
           getTransactions(),
           getCategories(),
           getAccounts()
         ]);
         
         // Garante que recebemos arrays válidos
         const safeTxs = Array.isArray(txsData) ? txsData : [];
         const safeCats = Array.isArray(catsData) ? catsData : [];
         const safeAccs = Array.isArray(accsData) ? accsData : [];

         // Ordena transações da mais recente para a mais antiga
         safeTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

         setTransactions(safeTxs);
         setCategories(safeCats);
         setAccounts(safeAccs);
       } catch (error) {
         console.error("Erro crítico ao carregar extrato:", error);
         // Mantém listas vazias para não quebrar a UI
         setTransactions([]);
       } finally {
         setLoading(false);
       }
    };

    loadData();
  }, []);

  // --- HELPERS PARA NOMES ---
  const getCategoryName = (id: string) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : 'Sem Categoria';
  };

  const getAccountName = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    return acc ? acc.name : 'Conta Desconhecida';
  };

  // --- LÓGICA DE FILTRAGEM COMPLEXA ---
  const filteredTransactions = transactions.filter(tx => {
    // 1. Filtro de Texto (Busca)
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      tx.description.toLowerCase().includes(term) || 
      getCategoryName(tx.categoryId).toLowerCase().includes(term) ||
      getAccountName(tx.accountId).toLowerCase().includes(term);

    // 2. Filtro de Status (Pago/Pendente)
    let matchesStatus = true;
    if (statusFilter === 'PAID') matchesStatus = tx.isPaid;
    if (statusFilter === 'PENDING') matchesStatus = !tx.isPaid;

    // 3. Filtro de Tipo (Receita/Despesa) - ESSENCIAL PARA DIFERENCIAR DE DESPESAS
    let matchesType = true;
    if (typeFilter === 'INCOME') matchesType = tx.type === 'INCOME';
    if (typeFilter === 'EXPENSE') matchesType = tx.type === 'EXPENSE';

    return matchesSearch && matchesStatus && matchesType;
  });

  // --- EXPORTAÇÃO PDF ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho do PDF
    doc.setFillColor(5, 150, 105); // Cor Emerald
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Extrato Financeiro - Andrade Finance", 14, 13);
    
    // Informações do Relatório
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);
    doc.text(`Filtros: Status=${statusFilter}, Tipo=${typeFilter}`, 14, 35);

    const tableBody = filteredTransactions.map(tx => [
      format(new Date(tx.date), 'dd/MM/yyyy'),
      tx.description,
      getCategoryName(tx.categoryId),
      tx.type === 'INCOME' ? 'Receita' : 'Despesa',
      `R$ ${tx.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      tx.isPaid ? 'Pago' : 'Pendente'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold' }, // Coluna Valor
        5: { halign: 'center' } // Coluna Status
      }
    });

    doc.save(`extrato_transacoes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // --- RENDERIZAÇÃO DE CARREGAMENTO ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Sincronizando transações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      
      {/* --- CABEÇALHO SUPERIOR --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 flex items-center">
             <Wallet className="mr-3 text-brand-600" size={28} />
             Extrato de Transações
           </h1>
           <p className="text-gray-500 text-sm mt-1 ml-10">
             Histórico completo de todas as suas movimentações financeiras.
           </p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
           {/* Barra de Busca */}
           <div className="relative flex-1 md:w-72 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por nome, categoria..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
           </div>
           
           {/* Botão Exportar */}
           <button 
             onClick={handleExportPDF}
             className="flex items-center justify-center space-x-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-brand-200 hover:text-brand-700 font-medium transition-all shadow-sm active:scale-95"
           >
             <Download size={18} />
             <span>PDF</span>
           </button>
        </div>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div className="flex flex-col lg:flex-row gap-4">
         
         {/* Filtro de TIPO (Receita / Despesa) */}
         <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex-1">
            <button 
               onClick={() => setTypeFilter('ALL')}
               className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-bold transition-all ${
                  typeFilter === 'ALL' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
               }`}
            >
               Tudo
            </button>
            <button 
               onClick={() => setTypeFilter('INCOME')}
               className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-bold transition-all ${
                  typeFilter === 'INCOME' ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-gray-500 hover:bg-gray-50'
               }`}
            >
               <ArrowUpCircle size={16} className="mr-2" /> Receitas
            </button>
            <button 
               onClick={() => setTypeFilter('EXPENSE')}
               className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-bold transition-all ${
                  typeFilter === 'EXPENSE' ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-100' : 'text-gray-500 hover:bg-gray-50'
               }`}
            >
               <ArrowDownCircle size={16} className="mr-2" /> Despesas
            </button>
         </div>

         {/* Filtro de STATUS (Pago / Pendente) */}
         <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-full lg:w-auto min-w-[300px]">
            <button 
               onClick={() => setStatusFilter('ALL')}
               className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  statusFilter === 'ALL' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
               }`}
            >
               Todos
            </button>
            <button 
               onClick={() => setStatusFilter('PENDING')}
               className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  statusFilter === 'PENDING' ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'text-gray-500 hover:bg-gray-50'
               }`}
            >
               Pendentes
            </button>
            <button 
               onClick={() => setStatusFilter('PAID')}
               className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  statusFilter === 'PAID' ? 'bg-green-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
               }`}
            >
               Pagos
            </button>
         </div>
      </div>

      {/* --- LISTAGEM DE TRANSAÇÕES --- */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
         
         {/* Cabeçalho da Tabela (Desktop) */}
         <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-5">Descrição / Categoria</div>
            <div className="col-span-3">Data</div>
            <div className="col-span-2 text-right">Valor</div>
            <div className="col-span-2 text-center">Status</div>
         </div>

         {/* Corpo da Lista */}
         <div className="divide-y divide-gray-50 flex-1">
            {filteredTransactions.length > 0 ? (
               filteredTransactions.slice(0, displayLimit).map((tx) => (
               <div 
                  key={tx.id} 
                  onClick={() => onEditTransaction(tx)}
                  className="group hover:bg-brand-50/30 transition-colors cursor-pointer p-4"
               >
                  {/* Layout Mobile (Padrão Flex) */}
                  <div className="md:hidden flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${
                              tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                          }`}>
                              {tx.type === 'INCOME' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                          </div>
                          <div>
                              <h4 className="font-bold text-gray-900">{tx.description}</h4>
                              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                  <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 mr-2">
                                    {getCategoryName(tx.categoryId)}
                                  </span>
                                  <span>{format(new Date(tx.date), 'dd/MM')}</span>
                              </div>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className={`font-bold text-base ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {tx.type === 'INCOME' ? '+' : '-'} R$ {tx.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </p>
                          <div className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                              {tx.isPaid ? 'Pago' : 'Pendente'}
                          </div>
                      </div>
                  </div>

                  {/* Layout Desktop (Grid) */}
                  <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-5 flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm transition-transform group-hover:scale-110 ${
                              tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                          }`}>
                              {tx.type === 'INCOME' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                          </div>
                          <div>
                              <p className="font-bold text-gray-900 text-sm">{tx.description}</p>
                              <p className="text-xs text-gray-500 flex items-center mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-gray-300 mr-2"></span>
                                {getCategoryName(tx.categoryId)}
                              </p>
                          </div>
                      </div>
                      
                      <div className="col-span-3 text-sm text-gray-600 flex items-center">
                          <Calendar size={14} className="mr-2 text-gray-400" />
                          {format(new Date(tx.date), "d 'de' MMMM, yyyy", { locale: ptBR })}
                      </div>
                      
                      <div className={`col-span-2 text-right font-bold text-sm ${
                          tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                          {tx.type === 'INCOME' ? '+' : '-'} R$ {tx.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </div>
                      
                      <div className="col-span-2 flex justify-center">
                          <span className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                              tx.isPaid 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                              {tx.isPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              <span>{tx.isPaid ? 'CONCLUÍDO' : 'PENDENTE'}</span>
                          </span>
                      </div>
                  </div>
               </div>
               ))
            ) : (
               /* Estado Vazio */
               <div className="flex flex-col items-center justify-center h-80 text-gray-400 bg-gray-50/30">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                     <Search size={48} className="text-gray-300" />
                  </div>
                  <p className="font-medium text-lg text-gray-600">Nenhum lançamento encontrado</p>
                  <p className="text-sm max-w-xs text-center mt-2">
                     Tente ajustar os filtros de status, tipo ou sua busca para encontrar o que precisa.
                  </p>
                  {(searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
                     <button 
                        onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setTypeFilter('ALL'); }}
                        className="mt-6 text-brand-600 font-bold text-sm hover:underline"
                     >
                        Limpar todos os filtros
                     </button>
                  )}
               </div>
            )}
         </div>

         {/* Rodapé da Lista (Paginação Simples) */}
         {filteredTransactions.length > displayLimit && (
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-center">
               <button 
                  onClick={() => setDisplayLimit(prev => prev + 20)}
                  className="flex items-center text-xs font-bold text-gray-500 hover:text-brand-600 transition-colors"
               >
                  <ChevronDown size={16} className="mr-1" />
                  Carregar mais movimentações
               </button>
            </div>
         )}
      </div>
    </div>
  );
};

export default TransactionsView;