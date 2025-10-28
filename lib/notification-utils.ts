import { notificationService, NotificationType, NotificationData } from './notifications';

// Mock functions - replace with your actual database queries
async function getAdminPhoneNumbers(): Promise<string[]> {
  // Replace with your actual admin phone number retrieval
  return ['+19789180688', '+19789180688']; // Example admin numbers
}

async function getTontineMembers(tontineId: string): Promise<Array<{ phoneNumber: string }>> {
  // Replace with your actual tontine member retrieval
  return [
    { phoneNumber: '+19789180688' },
    { phoneNumber: '+19789180688' },
  ];
}

export async function notifyAdmin(type: NotificationType, data: any): Promise<void> {
  const adminPhoneNumbers = await getAdminPhoneNumbers();
  
  const notifications: NotificationData[] = adminPhoneNumbers.map(phoneNumber => ({
    phoneNumber,
    type,
    data
  }));

  await notificationService.sendBulkNotifications(notifications);
}

export async function notifyTontineMembers(tontineId: string, type: NotificationType, data: any): Promise<void> {
  const members = await getTontineMembers(tontineId);
  
  const notifications: NotificationData[] = members.map(member => ({
    phoneNumber: member.phoneNumber,
    type,
    data
  }));

  await notificationService.sendBulkNotifications(notifications);
}

export async function notifyAllUsers(phoneNumbers: string[], type: NotificationType, data: any): Promise<void> {
  const notifications: NotificationData[] = phoneNumbers.map(phoneNumber => ({
    phoneNumber,
    type,
    data
  }));

  await notificationService.sendBulkNotifications(notifications);
}