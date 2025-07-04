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
          // Default styles for all toasts
          style: {
            background: '#FFFFFF',
            color: '#181a24', // cast-iron color
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            padding: '16px',
            borderRadius: '8px',
          },
          // Custom styles for different toast types
          success: {
            style: {
              background: '#3E9D61', // light-green color
              color: 'white',
            },
            iconTheme: {
              primary: 'white',
              secondary: '#3E9D61',
            },
          },
          error: {
            style: {
              background: '#EE4534', // tomato color
              color: 'white',
            },
            iconTheme: {
              primary: 'white',
              secondary: '#EE4534',
            },
          },
          // Duration settings
          duration: 4000, // 4 seconds
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