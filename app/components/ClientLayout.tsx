'use client';

import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../context/AuthContext';
import { FriendsProvider } from '../context/FriendsContext';
import { useEffect } from 'react';
import { useFriends } from '../context/FriendsContext';

function TitleNotifications() {
  const { sharedRecipes } = useFriends();
  
  useEffect(() => {
    // Update the title when shared recipes change
    if (sharedRecipes.length > 0) {
      document.title = `(${sharedRecipes.length}) Syft - Recipe Manager`;
    } else {
      document.title = 'Syft - Recipe Manager';
    }
    
    return () => {
      document.title = 'Syft - Recipe Manager';
    };
  }, [sharedRecipes]);
  
  return null;
}

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TitleNotifications />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#2C1A0E',
            boxShadow: '0 8px 24px rgba(44, 26, 14, 0.12)',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            style: {
              background: '#6B9E78',
              color: 'white',
            },
            iconTheme: {
              primary: 'white',
              secondary: '#6B9E78',
            },
          },
          error: {
            style: {
              background: '#D4883A',
              color: 'white',
            },
            iconTheme: {
              primary: 'white',
              secondary: '#D4883A',
            },
          },
          duration: 4000,
        }}
      />
      {children}
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FriendsProvider>
        <ClientLayoutContent>
          {children}
        </ClientLayoutContent>
      </FriendsProvider>
    </AuthProvider>
  );
} 