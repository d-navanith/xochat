import React, { useState } from 'react';
import { XochatLogo } from './CustomerPortal';
import { Eye, EyeOff } from 'lucide-react';

interface AuthCardProps {
  type: 'ADMIN' | 'TEAM';
  onLogin: (username: string, passwordOrCode: string) => Promise<void>;
  onClose?: () => void;
}

export const DedicatedAuthModal: React.FC<AuthCardProps> = ({ type, onLogin, onClose }) => {
  const isAdmin = type === 'ADMIN';
  const [username, setUsername] = useState(isAdmin ? 'coreadmin' : 'murdock');
  const [credential, setCredential] = useState(
    isAdmin ? 'ADMIN_SECRET_2026' : 'murdock123'
  );
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!username.trim() || !credential.trim()) {
        throw new Error('Please fill in both fields');
      }
      await onLogin(username.trim(), credential.trim());
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const title = isAdmin ? 'ADMIN LOGIN' : 'XOCHAT TEAM LOGIN';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border-[1.5px] border-[#ef4444] shadow-2xl max-w-md w-full p-4 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="mb-3 px-2 flex flex-col items-center">
          <XochatLogo size="md" />
        </div>

        <div className="bg-[#9faab0] rounded-xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.14] z-0">
            <svg viewBox="0 0 200 200" className="w-80 h-80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="40,20 85,20 45,180 0,180" fill="#ffffff" />
              <polygon points="60,20 160,180 205,180 105,20" fill="#ffffff" />
            </svg>
          </div>

          <div className="relative z-10">
            <h2 className="text-center font-bold text-gray-800 text-sm sm:text-base uppercase tracking-wider mb-6">
              {title}
            </h2>

            {error && (
              <div className="mb-4 p-2.5 bg-red-100 border border-red-300 text-red-800 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* USERNAME INPUT */}
              <div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="User Name"
                  className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-red-500"
                />
              </div>

              {/* PASSWORD OR SECRET CODE */}
              {isAdmin ? (
                <div>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      required
                      value={credential}
                      onChange={(e) => setCredential(e.target.value)}
                      placeholder="Please Enter Your Secret Code"
                      className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-3 text-sm outline-none shadow-xs border border-transparent focus:border-red-500 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="password"
                    required
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    placeholder="Enter Password"
                    className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-red-500"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#d50000] hover:bg-[#b70000] active:bg-[#990000] text-white font-extrabold text-base py-3 rounded-full shadow-md tracking-wider uppercase transition-transform active:scale-98 cursor-pointer disabled:opacity-75"
                >
                  {loading ? 'AUTHENTICATING...' : 'LOGIN'}
                </button>
              </div>

              {onClose && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-gray-700 hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
