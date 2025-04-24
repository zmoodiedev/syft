'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Button from '@/app/components/Button';

interface MigrationResult {
  message: string;
  migratedCount: number;
}

export default function MigratePage() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState('');

  const runMigration = async () => {
    if (!user) {
      setError('You must be logged in to access this page');
      return;
    }

    if (!secretKey) {
      setError('Please enter the admin secret key');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/migrate-recipe-visibility?secret=${encodeURIComponent(secretKey)}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to run migration');
      }
    } catch (err) {
      console.error('Error running migration:', err);
      setError('Error connecting to the server');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Admin: Recipe Visibility Migration</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="mb-4">
          This migration will add a visibility field to all recipes in the database 
          based on each user&apos;s current visibility preference.
        </p>
        
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
          onClick={runMigration}
          disabled={isRunning}
        >
          {isRunning ? 'Running Migration...' : 'Run Migration'}
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="text-red-700 font-semibold">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-green-700 font-semibold">Migration Complete</h2>
          <p className="text-green-600">
            Successfully migrated {result.migratedCount} recipes!
          </p>
          <pre className="mt-4 bg-white p-3 rounded text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 