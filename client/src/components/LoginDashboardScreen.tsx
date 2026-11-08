import React, { useState } from 'react';
import { XochatLogo, NetworkBackground, XWatermark } from './CustomerPortal';
import { Eye, EyeOff } from 'lucide-react';

interface LoginDashboardScreenProps {
  portalRole: 'ADMIN' | 'TEAM';
  onLogin: (username: string, passwordOrSecret: string) => Promise<void>;
}

export const LoginDashboardScreen: React.FC<LoginDashboardScreenProps> = ({
  portalRole,
  onLogin,
}) => {
  const isAdmin = portalRole === 'ADMIN';

  // State: Username (NOT full name!)
  const [username, setUsername] = useState(isAdmin ? 'coreadmin' : 'murdock');
  const [secretOrPassword, setSecretOrPassword] = useState(
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
      if (!username.trim() || !secretOrPassword.trim()) {
        throw new Error('Please fill in both fields');
      }

      // Backend identifies if this is Super Admin or Admin via their username and secret code!
      await onLogin(username.trim(), secretOrPassword.trim());
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const title = isAdmin ? 'ADMIN LOGIN' : 'XOCHAT TEAM LOGIN';

  return (
    <div className="min-h-screen text-gray-900 flex flex-col font-sans relative overflow-x-hidden bg-[#fafafa]">
      {/* Official Network Background & Geometric X Background Effect */}
      <NetworkBackground />
      <XWatermark opacity="opacity-[0.07]" size="w-[680px]" />

      {/* Top Navbar matching Image */}
      <header className="relative z-10 bg-white/95 backdrop-blur-xs border-b border-gray-200 px-8 py-3.5 flex items-center justify-between shadow-2xs">
        <XochatLogo size="md" />
        <button
          onClick={() => {}}
          className="px-6 py-1.5 border border-[#0066ff] text-[#0066ff] font-semibold text-sm rounded-lg transition-colors cursor-pointer"
        >
          Login
        </button>
      </header>

      {/* Main Login Dashboard Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        {/* Signature Red Bordered Card */}
        <div className="bg-white rounded-2xl border-[1.5px] border-[#ef4444] shadow-xl max-w-md w-full p-4 flex flex-col">
          {/* Logo inside card */}
          <div className="mb-3 px-2 flex flex-col items-center">
            <XochatLogo size="md" />
          </div>

          {/* Matte Grey Canvas with Faint X Watermark */}
          <div className="bg-[#9faab0] rounded-xl p-8 relative overflow-hidden">
            <XWatermark />

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
                {/* 1. USERNAME INPUT (User Name, NOT Full Name!) */}
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

                {/* 2. PASSWORD / SECRET CODE INPUT */}
                {isAdmin ? (
                  /* Admin Secret Code with Eye Toggle Icon */
                  <div>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        required
                        value={secretOrPassword}
                        onChange={(e) => setSecretOrPassword(e.target.value)}
                        placeholder="Please Enter Your Secret Code"
                        className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-3 text-sm outline-none shadow-xs border border-transparent focus:border-red-500 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Team Member Password Input with Eye Toggle */
                  <div>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        required
                        value={secretOrPassword}
                        onChange={(e) => setSecretOrPassword(e.target.value)}
                        placeholder="Enter Password"
                        className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-red-500 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        aria-label={showSecret ? 'Hide password' : 'View password'}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* VIVID RED LOGIN BUTTON */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#d50000] hover:bg-[#b70000] active:bg-[#990000] text-white font-extrabold text-base py-3 rounded-full shadow-md tracking-wider uppercase transition-transform active:scale-98 cursor-pointer disabled:opacity-75"
                  >
                    {loading ? 'AUTHENTICATING...' : 'LOGIN'}
                  </button>
                </div>

                {/* Helpful hints for testing */}
                {isAdmin && (
                  <div className="pt-2 text-center text-[11px] text-gray-700/80">
                    <p className="font-semibold">Admin Authentication:</p>
                    <p>• <strong>coreadmin</strong> + secret code → Identifies as Admin</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
