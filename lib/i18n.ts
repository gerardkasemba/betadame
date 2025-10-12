// lib/i18n.ts
export const fr = {
  // Common
  common: {
    welcome: "Bienvenue",
    loading: "Chargement...",
    error: "Erreur",
    success: "Succès",
    cancel: "Annuler",
    confirm: "Confirmer",
    save: "Sauvegarder",
    delete: "Supprimer",
  },

  // Auth
  auth: {
    login: "Connexion",
    register: "Inscription",
    logout: "Déconnexion",
    email: "Email",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    forgotPassword: "Mot de passe oublié?",
    noAccount: "Pas de compte?",
    hasAccount: "Déjà un compte?",
  },

  // Dashboard
  dashboard: {
    title: "Tableau de Bord",
    overview: "Aperçu",
    playGame: "Jouer",
    wallet: "Portefeuille",
    players: "Joueurs",
    statistics: "Statistiques",
    settings: "Paramètres",
    balance: "Solde",
    deposit: "Déposer",
    withdraw: "Retirer",
    recentGames: "Parties Récentes",
    quickActions: "Actions Rapides",
    onlinePlayers: "Joueurs en Ligne",
    accueil: "Accueil",
    envoyer: "Envoyer",
    transactions: "Transactions"
  },

  // Game
  game: {
    createRoom: "Créer une Salle",
    joinRoom: "Rejoindre une Salle",
    betAmount: "Mise",
    players: "Joueurs",
    status: "Statut",
    waiting: "En attente",
    playing: "En cours",
    finished: "Terminé",
    winner: "Gagnant",
    yourTurn: "À votre tour",
  },

  // Wallet
  wallet: {
    depositTitle: "Déposer des Fonds",
    withdrawTitle: "Retirer des Fonds",
    agentCard: "Carte d'Agent",
    enterCardNumber: "Entrez le numéro de carte",
    generateQR: "Générer un QR Code",
    transactionHistory: "Historique des Transactions",
    amount: "Montant",
    date: "Date",
    status: "Statut",
    pending: "En attente",
    completed: "Complété",
    failed: "Échoué",
  },

  // Regions (Congolese provinces)
  regions: {
    kinshasa: "Kinshasa",
    kongoCentral: "Kongo-Central",
    kwango: "Kwango",
    kwilu: "Kwilu",
    maiNdombe: "Mai-Ndombe",
    equateur: "Équateur",
    mongala: "Mongala",
    nordUbangi: "Nord-Ubangi",
    sudUbangi: "Sud-Ubangi",
    tshuapa: "Tshuapa",
    tshopo: "Tshopo",
    basUele: "Bas-Uélé",
    hautUele: "Haut-Uélé",
    ituri: "Ituri",
    maniema: "Maniema",
    nordKivu: "Nord-Kivu",
    sudKivu: "Sud-Kivu",
    hautKatanga: "Haut-Katanga",
    hautLomami: "Haut-Lomami",
    lualaba: "Lualaba",
    tanganyika: "Tanganyika",
    lomami: "Lomami",
    sankuru: "Sankuru",
    kasai: "Kasaï",
    kasaiCentral: "Kasaï-Central",
    kasaiOriental: "Kasaï-Oriental",
  },
}

export type TranslationKey = keyof typeof fr