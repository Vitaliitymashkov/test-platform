import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const AuthDebug: React.FC = () => {
  const { user, token, loading } = useAuth();
  const localToken = localStorage.getItem('token');

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <h3 className="font-bold text-sm mb-2">Auth Debug</h3>
      <div className="text-xs space-y-1">
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>User: {user ? user.email : 'null'}</div>
        <div>Context Token: {token ? `${token.substring(0, 20)}...` : 'null'}</div>
        <div>Local Token: {localToken ? `${localToken.substring(0, 20)}...` : 'null'}</div>
        <div className="pt-2">
          <button
            onClick={() => window.location.reload()}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};