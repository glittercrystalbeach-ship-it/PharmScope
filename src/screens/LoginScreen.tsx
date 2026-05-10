import { useState } from 'react';
import { Pill, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  onLogin: () => void;
}

type Mode = 'login' | 'register';

export default function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [pharmacyName, setPharmacyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }
    if (mode === 'register' && !pharmacyName.trim()) {
      setError('薬局名を入力してください');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onLogin();
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.user) {
          await supabase.from('pharmacies').insert({
            id: data.user.id,
            name: pharmacyName,
          });
        }
        onLogin();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Invalid login')) setError('メールアドレスまたはパスワードが違います');
      else if (msg.includes('already registered')) setError('このメールアドレスは既に登録済みです');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e3f2fd] via-white to-[#f8f9fa] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 bg-[#2196f3] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-3">
          <Pill className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">小児処方チェッカー</h1>
        <p className="text-gray-400 text-sm mt-1">薬局専用システム</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-gray-100 p-6 border border-gray-100">
        {/* Mode tabs */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-5">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-[#2196f3] text-white' : 'text-gray-500 bg-white'}`}
          >
            ログイン
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'register' ? 'bg-[#2196f3] text-white' : 'text-gray-500 bg-white'}`}
          >
            新規登録
          </button>
        </div>

        <div className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">薬局名</label>
              <input
                type="text"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                placeholder="例：〇〇薬局 △△店"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">メールアドレス</label>
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pharmacy@example.com"
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">パスワード</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2196f3]/30 focus:border-[#2196f3]"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#2196f3] text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all disabled:opacity-60 mt-1"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <><LogIn className="w-4 h-4" />ログイン</>
            ) : (
              <><UserPlus className="w-4 h-4" />薬局を登録する</>
            )}
          </button>
        </div>
      </div>

      <p className="text-gray-400 text-xs text-center mt-6 px-4">
        このシステムは薬局専用です。登録した薬局のデータのみアクセスできます。
      </p>
    </div>
  );
}
