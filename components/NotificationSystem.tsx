import React, { useEffect, useState, useRef } from 'react';
import { AppNotification, NotificationPreferences } from '../types';
import { checkUpcomingAlerts, getNotificationPreferences } from '../services/storageService';
import { Bell, AlertTriangle, AlertCircle, X } from 'lucide-react';

const NotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  // Removi lógica complexa de settings/prefs por enquanto para focar na estabilidade
  
  // Carregamento Assíncrono Seguro
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        // O AWAIT aqui é fundamental!
        const alerts = await checkUpcomingAlerts();
        
        // Garante que é array
        if (Array.isArray(alerts)) {
           setNotifications(alerts);
        } else {
           setNotifications([]);
        }

        // Lógica de Permissão de Notificação do Navegador
        if ('Notification' in window) {
           setHasPermission(Notification.permission === 'granted');
        }

      } catch (error) {
        console.error("Erro ao carregar notificações:", error);
        setNotifications([]); // Falha silenciosa para não travar o app
      }
    };

    loadNotifications();
    
    // Check periódico (opcional, a cada 1 minuto)
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setHasPermission(permission === 'granted');
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Se não tiver notificações, não renderiza nada
  if (notifications.length === 0) return null;

  return (
    <div className="flex flex-col space-y-3 pointer-events-none p-4">
      {/* Botão de Permissão (Só aparece se necessário e tiver alertas críticos) */}
      {!hasPermission && notifications.some(n => n.type === 'danger') && (
         <div className="pointer-events-auto bg-white p-3 rounded-xl shadow-lg border border-brand-100 flex items-center justify-between animate-fade-in-down">
            <div className="flex items-center space-x-2 text-xs text-gray-600">
               <Bell size={14} className="text-brand-500" />
               <span>Ativar notificações de sistema?</span>
            </div>
            <button 
               onClick={requestPermission} 
               className="bg-brand-50 text-brand-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
            >
               Ativar
            </button>
         </div>
      )}

      {/* Lista de Alertas */}
      {notifications.map(notif => (
        <div 
          key={notif.id}
          className={`pointer-events-auto w-full flex items-start p-4 rounded-xl shadow-xl border-l-4 transition-all duration-500 animate-slide-in-right bg-white/95 backdrop-blur-sm ${
             notif.type === 'danger' ? 'border-red-500 shadow-red-100' :
             notif.type === 'warning' ? 'border-yellow-500 shadow-yellow-100' :
             'border-blue-500 shadow-blue-100'
          }`}
        >
          <div className="mr-3 mt-0.5 shrink-0">
             {notif.type === 'danger' && <AlertCircle className="text-red-500" size={20} />}
             {notif.type === 'warning' && <AlertTriangle className="text-yellow-500" size={20} />}
             {notif.type === 'info' && <Bell className="text-blue-500" size={20} />}
          </div>
          <div className="flex-1 min-w-0">
             <h4 className="text-sm font-bold text-gray-900 truncate">{notif.title}</h4>
             <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{notif.message}</p>
             <p className="text-[10px] text-gray-400 mt-2 font-medium">
                {new Date(notif.date).toLocaleDateString()}
             </p>
          </div>
          <button 
             onClick={() => removeNotification(notif.id)}
             className="ml-2 text-gray-300 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
             <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;