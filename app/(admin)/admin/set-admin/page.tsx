'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Button from '@/app/components/Button';

export default function SetAdminPage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to access this page');
      return;
    }

    if (!userId) {
      setError('Please enter a user ID');
      return;
    }

    if (!secretKey) {
      setError('Please enter the admin secret key');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/set-admin-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, secret: secretKey }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({ success: true, message: data.message });
      } else {
        setError(data.error || 'Failed to set admin role');
      }
    } catch (err) {
      console.error('Error setting admin role:', err);
      setError('Error connecting to the server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Admin: Set User as Admin</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter the user ID"
            />
            <p className="mt-1 text-sm text-gray-500">
              Use your own user ID ({user?.uid}) to make yourself an admin
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Secret Key
            </label>
            <input
              type="password"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter the admin secret key"
            />
          </div>
          
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Setting Admin Role...' : 'Set as Admin'}
          </Button>
        </form>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="text-red-700 font-semibold">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-green-700 font-semibold">Success</h2>
          <p className="text-green-600">{result.message}</p>
        </div>
      )}
    </div>
  );
} 