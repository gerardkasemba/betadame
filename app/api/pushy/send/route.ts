// app/api/pushy/send/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { title, message, topic, deviceToken, data } = await request.json();

    const pushyApiUrl = 'https://api.pushy.me/push?api_key=' + process.env.PUSHY_SECRET_API_KEY;

    const notification = {
      to: deviceToken || topic, // Send to specific device or topic
      data: {
        title: title || 'Betadame Notification',
        message: message || 'You have a new update',
        ...data,
      },
      notification: {
        title: title || 'Betadame Notification',
        body: message || 'You have a new update',
        badge: 1,
        sound: 'default',
      },
      // Time to live (in seconds) - notification expires after this time
      time_to_live: 86400, // 24 hours
    };

    const response = await fetch(pushyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Pushy API error:', result);
      return NextResponse.json(
        { error: 'Failed to send notification', details: result },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error sending Pushy notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Example usage function (can be called from server actions or API routes)
export async function sendGameNotification(
  topic: string,
  title: string,
  message: string,
  gameId?: string
) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/pushy/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: `topic/${topic}`,
      title,
      message,
      data: {
        gameId,
        url: gameId ? `/game/${gameId}` : '/games',
      },
    }),
  });

  return response.json();
}