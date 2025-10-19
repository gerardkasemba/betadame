// components/SupabasePushyNotifier.tsx
'use client';

import { useEffect } from 'react';
import { usePushy } from './PushyProvider';
import { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationPayload {
  title: string;
  message: string;
  url?: string;
  [key: string]: any;
}

interface SupabasePushyNotifierProps {
  channel: RealtimeChannel | null;
  tableName: string;
  userId?: string;
  onInsert?: (payload: any) => NotificationPayload;
  onUpdate?: (payload: any) => NotificationPayload;
  onDelete?: (payload: any) => NotificationPayload;
  children: React.ReactNode;
}

export function SupabasePushyNotifier({
  channel,
  tableName,
  userId,
  onInsert,
  onUpdate,
  onDelete,
  children,
}: SupabasePushyNotifierProps) {
  const { isReady, subscribe, deviceToken } = usePushy();

  useEffect(() => {
    // Subscribe to topic when Pushy is ready
    if (isReady && tableName) {
      subscribe(tableName);
      
      if (userId) {
        subscribe(`user-${userId}`);
      }
    }
  }, [isReady, tableName, userId, subscribe]);

  useEffect(() => {
    if (!channel || !isReady || !deviceToken) return;

    const sendNotificationToServer = async (payload: NotificationPayload) => {
      try {
        // Send notification via your backend
        await fetch('/api/pushy/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceToken,
            ...payload,
          }),
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    };

    const handleInsert = (payload: any) => {
      if (onInsert) {
        const notification = onInsert(payload);
        sendNotificationToServer(notification);
      }
    };

    const handleUpdate = (payload: any) => {
      if (onUpdate) {
        const notification = onUpdate(payload);
        sendNotificationToServer(notification);
      }
    };

    const handleDelete = (payload: any) => {
      if (onDelete) {
        const notification = onDelete(payload);
        sendNotificationToServer(notification);
      }
    };

    // Subscribe to realtime events
    if (onInsert) {
      channel.on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: tableName },
        handleInsert
      );
    }

    if (onUpdate) {
      channel.on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: tableName },
        handleUpdate
      );
    }

    if (onDelete) {
      channel.on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: tableName },
        handleDelete
      );
    }

    return () => {
      channel.unsubscribe();
    };
  }, [channel, tableName, onInsert, onUpdate, onDelete, isReady, deviceToken]);

  return <>{children}</>;
}