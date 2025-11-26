import React, { useState } from 'react';
import { auth } from '../services/firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Wallet, User, Mail, Lock, Loader2 } from 'lucide-react';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(userCredential.user, { displayName: name });
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Erro ao conectar.";
      if (err.code === 'auth/invalid-credential') msg = "E-mail ou senha incorretos.";
      if (err.code === 'auth/email-already-in-use') msg = "E-mail já cadastrado.";
      if (err.code === 'auth/weak-password') msg = "Senha deve ter 6+ caracteres.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-900 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-emerald-50 p-4 rounded-full mb-4"><Wallet size={40} className="text-emerald-600" /></div>
            <h1 className="text-2xl font-bold text-gray-900">Andrade Finance</h1>
            <p className="text-gray-500 text-sm">Seu controle financeiro inteligente</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input type="text" placeholder="Seu Nome" className="w-full pl-10 p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" value={name} onChange={e => setName(e.target.value)} required={!isLogin} />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-gray-400" size={20} />
              <input type="email" placeholder="E-mail" className="w-full pl-10 p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-400" size={20} />
              <input type="password" placeholder="Senha" className="w-full pl-10 p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</p>}

            <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex justify-center items-center transition-all">
              {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Entrar' : 'Criar Conta')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-emerald-600 font-bold hover:underline text-sm">
              {isLogin ? 'Criar uma conta nova' : 'Já tenho conta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;