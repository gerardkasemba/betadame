import type { Metadata } from "next"
import RootLayout from "./client-component"

export const metadata: Metadata = {
  title: "BetaDame — Joue, Défie et Gagne",
  description:
    "BetaDame est une plateforme congolaise de jeux d’argent où les joueurs s’affrontent au jeu de dames pour gagner de l’argent en temps réel. Joue, défie et célèbre ta victoire.",
  keywords: [
    "BetaDame",
    "jeux de dames congolais",
    "jouer pour de l’argent",
    "jeux africains",
    "dames en ligne",
    "défi entre joueurs",
    "esport Congo",
  ],
  openGraph: {
    title: "BetaDame — Joue, Défie et Gagne",
    description:
      "Rejoins BetaDame, l’arène congolaise des joueurs où tradition et compétition se rencontrent. Joue au jeu de dames et gagne de l’argent réel.",
    url: "https://betadame.vercel.app",
    type: "website",
    images: ["/og-image.png"],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "BetaDame — Joue, Défie et Gagne",
    description:
      "Affronte d’autres joueurs au jeu de dames congolais pour gagner de l’argent réel. Joue et montre ton talent sur BetaDame.",
    images: ["/og-image.png"],
  },
  themeColor: "#004aad",
  manifest: "/manifest.json",
}

export default function ClientComponent({ children }: { children: React.ReactNode }) {
  return <html lang="en"><RootLayout>{children}</RootLayout></html>
}
