import React, { useState } from 'react';
import { X, Users, UserCheck } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, pass: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError(null);
    try {
      await onLogin(username, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await onLogin(user, pass);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sign in to HelpDesk</h2>
            <p className="text-xs text-gray-500 mt-0.5">Select a role or sign in with your credentials</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Quick Demo Role Logins */}
        <div className="mt-5 space-y-2.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Quick One-Click Demo Logins
          </label>

          <button
            type="button"
            onClick={() => handleQuickLogin('murdock', 'murdock123')}
            className="w-full flex items-center justify-between p-3 border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 rounded-xl transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-200 text-amber-800 rounded-lg">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900">@murdock (Agent)</div>
                <div className="text-xs text-gray-500">From UI Mockup 2 • Live Chat Responder</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-700 group-hover:translate-x-0.5 transition-transform">
              Login →
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('lisa', 'lisa123')}
            className="w-full flex items-center justify-between p-3 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 rounded-xl transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-200 text-blue-800 rounded-lg">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900">@lisa (Agent)</div>
                <div className="text-xs text-gray-500">Second Agent to test Collision Prevention</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-700 group-hover:translate-x-0.5 transition-transform">
              Login →
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('coreadmin', 'admin123')}
            className="w-full flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 rounded-xl transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-200 text-emerald-800 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900">@coreadmin (Admin)</div>
                <div className="text-xs text-gray-500">Add Team Members • Message Count Audits</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
              Login →
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-400 font-medium">Or enter credentials</span>
          </div>
        </div>

        {/* Custom Form */}
        <form onSubmit={handleCustomSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. murdock"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-xs"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
