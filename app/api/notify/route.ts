import { NextResponse } from 'next/server';
import webPush from 'web-push';

export async function POST(request: Request) {
  const { subscription, message } = await request.json();

  webPush.setVapidDetails(
    'mailto:gerardkasemba@gmail.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  await webPush.sendNotification(subscription, JSON.stringify({
    title: 'Congolese Dames',
    body: message,
  }));

  return NextResponse.json({ success: true });
}