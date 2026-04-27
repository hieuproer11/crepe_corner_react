# Crepe Corner — Application mobile (React Native / Expo)

Interface mobile **en français** permettant de :

- Parcourir le menu d'un restaurant (crêpes salées, crêpes sucrées)
- Construire un panier et passer une commande
- Suivre le statut de sa commande en temps réel (rafraîchissement auto toutes les 10 s)
- Annuler une commande tant qu'elle n'est pas prête
- Retrouver sa commande en cours depuis l'accueil (persistée via AsyncStorage)

L'application consomme l'API Symfony [`test_projet_cloud`](../test_projet_cloud).

## Stack

- Expo SDK 51 + React Native 0.74
- expo-router (navigation par fichiers)
- @react-native-async-storage/async-storage (persistance commande en cours)
- TypeScript

## Démarrage rapide

```bash
cd crepe_corner_react
npm install
npm start
```

Puis :
- **Téléphone réel** : scannez le QR code affiché par Expo avec l'app *Expo Go*
- **Émulateur Android** : `npm run android`
- **Simulateur iOS** : `npm run ios`

## Configuration de l'URL de l'API

L'URL est définie dans `app.json` sous `expo.extra.apiUrl`, et lue par `src/api.ts`.

| Cible                    | URL à utiliser                   |
| ------------------------ | -------------------------------- |
| Émulateur Android        | `http://10.0.2.2:8000/api`       |
| Simulateur iOS           | `http://127.0.0.1:8000/api`      |
| Téléphone réel (Expo Go) | `http://<IP_DE_TON_PC>:8000/api` |

> Pour un téléphone réel, le PC et le téléphone doivent être sur le **même réseau Wi-Fi**. L'URL est à mettre à jour dans `app.json`, puis relancer `npm start --clear`.

## Backend : démarrer l'API (Docker)

> WAMP doit être arrêté avant de lancer Docker (conflit port 8000).

```bash
docker compose up -d
docker compose exec php chmod -R 777 var/
```

Le backend tourne sur `http://localhost:8000` (ou `http://<IP_PC>:8000` depuis le téléphone).

Endpoints utilisés par l'app :

| Méthode | Route | Description |
| ------- | ----- | ----------- |
| `GET`   | `/api/restaurants/{id}/menu` | Menu du restaurant |
| `POST`  | `/api/restaurants/{id}/orders` | Créer une commande |
| `GET`   | `/api/restaurants/{id}/orders/{orderId}` | Détail / statut d'une commande |
| `PATCH` | `/api/restaurants/{id}/orders/{orderId}/cancel` | Annuler une commande |

L'app cible le restaurant **id = 1** par défaut (`RESTAURANT_ID` dans `app/panier.tsx`).

## Écrans

| Route            | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `/`              | Accueil — boutons Commander / Mon panier / Ma commande en cours        |
| `/menu`          | Liste des produits par catégorie, ajout au panier                      |
| `/panier`        | Détail du panier, ajustement des quantités, saisie client, commande    |
| `/commande/[id]` | Suivi de la commande (barre de progression) + bouton d'annulation      |

## Flux principal

```
Accueil → Menu → Panier → Commander → Ma commande (suivi + annulation)
                                           ↑
                          (accessible depuis l'accueil si commande en cours)
```

## Statuts de commande

| Statut      | Libellé        | Annulable |
| ----------- | -------------- | --------- |
| `received`  | Reçue          | Oui       |
| `dispatched`| Transmise      | Oui       |
| `preparing` | En préparation | Oui       |
| `ready`     | Prête          | Non       |
| `served`    | Servie         | Non       |
| `cancelled` | Annulée        | —         |

## Structure

```
app/
  _layout.tsx          # Layout racine + CartProvider
  index.tsx            # Accueil (+ bouton commande en cours)
  menu.tsx             # Menu du restaurant
  panier.tsx           # Panier + envoi de commande
  commande/[id].tsx    # Suivi de commande + annulation
src/
  api.ts               # Client HTTP + types
  cart.tsx             # Contexte React du panier
  theme.ts             # Couleurs & espacements
```

## Notes

- La commande en cours est sauvegardée dans `AsyncStorage` après checkout et effacée en cas d'annulation.
- Le panier est en mémoire (Context React) ; il est vidé après la commande.
- L'écran de suivi rafraîchit la commande automatiquement toutes les 10 s et supporte le pull-to-refresh.
- Après chaque redémarrage des containers Docker, relancer : `docker compose exec php chmod -R 777 var/`
