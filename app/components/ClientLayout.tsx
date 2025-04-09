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
      <Toaster position="top-center" />
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