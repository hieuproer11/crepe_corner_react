# Crepe Corner — Application mobile (React Native / Expo)

Interface mobile **en français** permettant de :

- Parcourir le menu d'un restaurant (crêpes, boissons, desserts)
- Construire un panier et passer une commande
- Suivre le statut de sa commande en temps réel (rafraîchissement auto toutes les 10 s)
- **Scanner un QR code** de commande pour l'ouvrir directement (utile pour le scénario *Meal On the Highway* où le véhicule arrive à proximité)

L'application consomme l'API Symfony [`crepe_corner_api`](../crepe_corner_api).

## Stack

- Expo SDK 51 + React Native 0.74
- expo-router (navigation par fichiers)
- expo-camera (scanner QR)
- TypeScript

## Démarrage rapide

```bash
cd crepe_corner_react
npm install
npm start
```

Puis :
- **Téléphone réel** : scannez le QR code affiché par Expo avec l'app *Expo Go*.
- **Émulateur Android** : `npm run android`
- **Simulateur iOS** : `npm run ios`

## Configuration de l'URL de l'API

L'URL est définie dans `app.json` sous `expo.extra.apiUrl`, et lue par `src/api.ts`.

| Cible                    | URL à utiliser                       |
| ------------------------ | ------------------------------------ |
| Émulateur Android        | `http://10.0.2.2:8000/api`           |
| Simulateur iOS           | `http://127.0.0.1:8000/api`          |
| Téléphone réel (Expo Go) | `http://<IP_DE_TON_PC>:8000/api`     |

> Pour un téléphone réel, le PC qui lance l'API et le téléphone doivent être **sur le même réseau Wi-Fi**, et le serveur Symfony doit écouter sur `0.0.0.0` (ex. `php -S 0.0.0.0:8000 -t public`).

Modifie `app.json` puis relance `npm start --clear`.

## Backend : démarrer l'API

Dans `crepe_corner_api/` :

```bash
composer install
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
php -S 0.0.0.0:8000 -t public
```

Endpoints utilisés par l'app :

- `GET  /api/restaurants/{id}/menu`
- `POST /api/commandes`
- `GET  /api/commandes/{id}`
- `PATCH /api/commandes/{id}/statut`

L'app cible le restaurant **id = 1** par défaut (`RESTAURANT_ID` dans `app/menu.tsx`).

## Écrans

| Route                  | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `/`                    | Accueil avec deux actions : commander / scanner        |
| `/menu`                | Liste des produits regroupés par catégorie + panier    |
| `/panier`              | Détail du panier, ajustement des quantités, commande   |
| `/commande/[id]`       | Suivi de la commande avec barre de progression         |
| `/scanner`             | Scanner QR code (caméra)                               |

## Format des QR codes acceptés

Le scanner reconnaît :

- Un identifiant brut : `42`
- Un préfixe : `commande:42` ou `commandes/42`
- Un deep link : `crepecorner://commande/42`
- Une URL : `https://exemple.com/commandes/42`

L'application appelle ensuite `GET /api/commandes/{id}` puis ouvre l'écran de suivi.

## Structure

```
app/
  _layout.tsx          # Layout racine + providers (CartProvider)
  index.tsx            # Accueil
  menu.tsx             # Menu du restaurant
  panier.tsx           # Panier + envoi de commande
  scanner.tsx          # Scanner QR
  commande/[id].tsx    # Suivi de commande
src/
  api.ts               # Client HTTP + types
  cart.tsx             # Contexte React du panier
  theme.ts             # Couleurs & espacements
```

## Notes

- L'écran de suivi rafraîchit la commande automatiquement toutes les 10 s, et permet aussi un "pull to refresh".
- Le panier est en mémoire uniquement (Context React). Si tu veux persister le panier au redémarrage, branche `@react-native-async-storage/async-storage` (déjà installé) dans `src/cart.tsx`.
- Le projet est volontairement simple et sans dépendance lourde, conforme à la démarche DevOps (image Docker légère possible côté CI/CD avec Expo EAS si besoin de builds natifs).
