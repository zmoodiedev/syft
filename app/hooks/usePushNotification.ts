'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotification() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
  }, []);

  useEffect(() => {
    if (!isSupported || !user) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => setIsSubscribed(!!sub));
    });
  }, [isSupported, user]);

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !user) return false;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });

    const token = await user.getIdToken();
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscription }),
    });

    if (res.ok) {
      setIsSubscribed(true);
      return true;
    }
    return false;
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!isSupported || !user) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();

    const token = await user.getIdToken();
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    setIsSubscribed(false);
    return true;
  };

  return { isSubscribed, isSupported, subscribe, unsubscribe };
}
