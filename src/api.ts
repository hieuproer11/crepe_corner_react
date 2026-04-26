import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Modifie cette URL selon ton environnement.
// - Émulateur Android : http://10.0.2.2:8000/api
// - Simulateur iOS    : http://127.0.0.1:8000/api
// - Téléphone réel    : http://<IP_DE_TON_PC>:8000/api  (sur le même Wi-Fi)
function getExpoHost(): string | undefined {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  if (!hostUri) return undefined;
  return hostUri.split(':')[0];
}

const DEFAULT_API_URL = (() => {
  const expoHost = getExpoHost();
  if (expoHost) {
    // In Expo Go dev mode, reuse the same host as Metro and target backend port 8000.
    return `http://${expoHost}:8000/api`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://127.0.0.1:8000/api';
})();

export const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? DEFAULT_API_URL;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const url = `${API_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(
      `Impossible de contacter l'API (${url}). Vérifie que le serveur est lancé et que l'URL est correcte.`,
    );
  }

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
      `Erreur HTTP ${response.status}`;
    throw new Error(String(message));
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---- Types renvoyés par l'API ----

export type Produit = {
  id: number;
  type: 'plat' | 'boisson' | 'dessert' | string;
  nom: string;
  description: string | null;
  prixCents: number;
  prix: string;
  disponible: boolean;
  alcoolisee?: boolean;
};

export type LigneCommande = {
  id: number;
  produitId: number;
  produitNom: string;
  typeProduit: string;
  quantite: number;
  prixUnitaireCents: number;
  lineTotalCents: number;
};

export type Commande = {
  id: number;
  restaurantId: number;
  statut: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | string;
  totalCents: number;
  total: string;
  dateCommande: string;
  updatedAt: string;
  lignes: LigneCommande[];
};

// ---- Endpoints ----

export const api = {
  health: () => request<{ status: string; timestamp: string }>('/health'),

  getMenu: (restaurantId: number) =>
    request<{ items: Produit[] }>(`/restaurants/${restaurantId}/menu`),

  createCommande: (restaurantId: number, items: Array<{ produitId: number; quantite: number }>) =>
    request<Commande>('/commandes', {
      method: 'POST',
      body: { restaurantId, items },
    }),

  getCommande: (id: number) => request<Commande>(`/commandes/${id}`),

  updateStatut: (id: number, statut: string) =>
    request<Commande>(`/commandes/${id}/statut`, {
      method: 'PATCH',
      body: { statut },
    }),
};

export const STATUT_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready: 'Prête',
  delivered: 'Livrée',
};

export function formatPrix(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}
