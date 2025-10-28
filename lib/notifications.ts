export enum NotificationType {
  // Deposit notifications
  USER_DEPOSIT_SENT = 'USER_DEPOSIT_SENT',
  AGENT_DEPOSIT_CONFIRMED = 'AGENT_DEPOSIT_CONFIRMED',
  AGENT_DEPOSIT_REJECTED = 'AGENT_DEPOSIT_REJECTED',
  
  // Withdrawal notifications
  USER_WITHDRAWAL_REQUESTED = 'USER_WITHDRAWAL_REQUESTED',
  AGENT_WITHDRAWAL_CONFIRMED = 'AGENT_WITHDRAWAL_CONFIRMED',
  AGENT_WITHDRAWAL_REJECTED = 'AGENT_WITHDRAWAL_REJECTED',
  
  // Agent balance notifications
  AGENT_BALANCE_LOW = 'AGENT_BALANCE_LOW',
  AGENT_WITHDRAWAL_REQUEST = 'AGENT_WITHDRAWAL_REQUEST',
  
  // Admin notifications
  NEW_USER_SIGNUP = 'NEW_USER_SIGNUP',
  NEW_AGENT_SIGNUP = 'NEW_AGENT_SIGNUP',
  
  // Game notifications
  NEW_GAME_CREATED = 'NEW_GAME_CREATED',
  USER_JOINED_GAME = 'USER_JOINED_GAME',
  GAME_ENDED = 'GAME_ENDED',
  REMATCH_REQUESTED = 'REMATCH_REQUESTED',
  
  // Money transfer notifications
  MONEY_RECEIVED = 'MONEY_RECEIVED',
  MONEY_REQUESTED = 'MONEY_REQUESTED',
  
  // Tontine notifications
  NEW_TONTINE_MEMBER = 'NEW_TONTINE_MEMBER',
  USER_LEFT_TONTINE = 'USER_LEFT_TONTINE',
  TONTINE_PAYMENT_DUE = 'TONTINE_PAYMENT_DUE',
  TONTINE_PAYMENT_RECEIVED = 'TONTINE_PAYMENT_RECEIVED',
  TONTINE_PAYMENT_DECLINED = 'TONTINE_PAYMENT_DECLINED'
}

export interface NotificationData {
  phoneNumber: string;
  type: NotificationType;
  data?: Record<string, any>;
}

class NotificationService {
  private getMessage(type: NotificationType, data?: Record<string, any>): string {
    const messages: Record<NotificationType, string> = {
      // Deposit notifications
      [NotificationType.USER_DEPOSIT_SENT]: 
        `💸 Nouveau dépôt reçu\n` +
        `Montant: ${data?.amount} ${data?.currency}\n` +
        `De: ${data?.userName}\n` +
        `Référence: ${data?.reference}`,
      
      [NotificationType.AGENT_DEPOSIT_CONFIRMED]:
        `✅ Dépôt confirmé\n` +
        `Votre dépôt de ${data?.amount} ${data?.currency} a été confirmé.\n` +
        `Votre solde a été mis à jour.`,
      
      [NotificationType.AGENT_DEPOSIT_REJECTED]:
        `❌ Dépôt rejeté\n` +
        `Votre dépôt de ${data?.amount} ${data?.currency} a été rejeté.\n` +
        `Raison: ${data?.reason || 'Non spécifiée'}`,
      
      // Withdrawal notifications
      [NotificationType.USER_WITHDRAWAL_REQUESTED]:
        `💸 Nouvelle demande de retrait\n` +
        `Montant: ${data?.amount} ${data?.currency}\n` +
        `De: ${data?.userName}\n` +
        `Référence: ${data?.reference}`,
      
      [NotificationType.AGENT_WITHDRAWAL_CONFIRMED]:
        `✅ Retrait confirmé\n` +
        `Votre retrait de ${data?.amount} ${data?.currency} a été confirmé.\n` +
        `Les fonds seront transférés sous peu.`,
      
      [NotificationType.AGENT_WITHDRAWAL_REJECTED]:
        `❌ Retrait rejeté\n` +
        `Votre retrait de ${data?.amount} ${data?.currency} a été rejeté.\n` +
        `Raison: ${data?.reason || 'Non spécifiée'}`,
      
      // Agent balance notifications
      [NotificationType.AGENT_BALANCE_LOW]:
        `⚠️ Solde faible\n` +
        `Votre solde disponible: ${data?.availableBalance} ${data?.currency}\n` +
        `Solde plateforme: ${data?.platformBalance} ${data?.currency}\n` +
        `Veuillez recharger votre compte.`,
      
      [NotificationType.AGENT_WITHDRAWAL_REQUEST]:
        `🏦 Demande de retrait agent\n` +
        `Agent: ${data?.agentName}\n` +
        `Montant: ${data?.amount} ${data?.currency}\n` +
        `Compte: ${data?.accountDetails}`,
      
      // Admin notifications
      [NotificationType.NEW_USER_SIGNUP]:
        `👤 Nouvel utilisateur inscrit\n` +
        `Nom: ${data?.userName}\n` +
        `Email: ${data?.email}\n` +
        `Téléphone: ${data?.phone}`,
      
      [NotificationType.NEW_AGENT_SIGNUP]:
        `🤵 Nouvelle demande agent\n` +
        `Nom: ${data?.agentName}\n` +
        `Entreprise: ${data?.businessName}\n` +
        `Téléphone: ${data?.phone}\n` +
        `Localisation: ${data?.location}`,
      
      // Game notifications
      [NotificationType.NEW_GAME_CREATED]:
        `🎮 Nouveau jeu créé: ${data?.gameTitle}\n` +
        `Mise: ${data?.betAmount} ${data?.currency}\n` +
        `Région: ${data?.region}\n` +
        `Rejoignez maintenant!`,
      
      [NotificationType.USER_JOINED_GAME]:
        `🎯 Un joueur a rejoint votre jeu\n` +
        `Jeu: ${data?.gameTitle}\n` +
        `Joueur: ${data?.joinedUserName}\n` +
        `La partie peut commencer!`,
      
      [NotificationType.GAME_ENDED]:
        `🏁 Partie terminée\n` +
        `Jeu: ${data?.gameTitle}\n` +
        `Résultat: ${data?.result}\n` +
        `Gains: ${data?.winnings} ${data?.currency}`,
      
      [NotificationType.REMATCH_REQUESTED]:
        `🔄 Demande de revanche\n` +
        `${data?.opponentName} veut une revanche!\n` +
        `Jeu: ${data?.gameTitle}`,
      
      // Money transfer notifications
      [NotificationType.MONEY_RECEIVED]:
        `💸 Argent reçu\n` +
        `De: ${data?.senderName}\n` +
        `Montant: ${data?.amount} ${data?.currency}\n` +
        `Message: ${data?.message || 'Aucun message'}`,
      
      [NotificationType.MONEY_REQUESTED]:
        `📋 Demande d'argent\n` +
        `De: ${data?.requesterName}\n` +
        `Montant: ${data?.amount} ${data?.currency}\n` +
        `Message: ${data?.message || 'Aucun message'}`,
      
      // Tontine notifications
      [NotificationType.NEW_TONTINE_MEMBER]:
        `👥 Nouveau membre dans la tontine\n` +
        `Tontine: ${data?.tontineName}\n` +
        `Nouveau membre: ${data?.newMemberName}\n` +
        `Total membres: ${data?.totalMembers}`,
      
      [NotificationType.USER_LEFT_TONTINE]:
        `🚪 Membre a quitté la tontine\n` +
        `Tontine: ${data?.tontineName}\n` +
        `Membre: ${data?.leftMemberName}\n` +
        `Total membres: ${data?.totalMembers}`,
      
      [NotificationType.TONTINE_PAYMENT_DUE]:
        `📅 Paiement tontine dû\n` +
        `Tontine: ${data?.tontineName}\n` +
        `Montant: ${data?.amount} ${data?.currency}\n` +
        `Date limite: ${data?.dueDate}`,
      
      [NotificationType.TONTINE_PAYMENT_RECEIVED]:
        `✅ Paiement tontine reçu\n` +
        `Tontine: ${data?.tontineName}\n` +
        `Montant: ${data?.amount} ${data?.currency}\n` +
        `Prochain paiement: ${data?.nextPaymentDate}`,
      
      [NotificationType.TONTINE_PAYMENT_DECLINED]:
        `❌ Paiement tontine échoué\n` +
        `Tontine: ${data?.tontineName}\n` +
        `Montant: ${data?.amount} ${data?.currency}\n` +
        `Raison: ${data?.reason || 'Non spécifiée'}\n` +
        `Veuillez réessayer.`
    };

    return messages[type] || 'Notification';
  }

  async sendNotification(notification: NotificationData): Promise<boolean> {
    try {
      const message = this.getMessage(notification.type, notification.data);
      
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: notification.phoneNumber,
          message: message
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Notification sending failed:', error);
      return false;
    }
  }

  async sendBulkNotifications(notifications: NotificationData[]): Promise<{ success: boolean; phoneNumber: string }[]> {
    const results = await Promise.all(
      notifications.map(async (notification) => {
        const success = await this.sendNotification(notification);
        return { success, phoneNumber: notification.phoneNumber };
      })
    );

    return results;
  }
}

export const notificationService = new NotificationService();