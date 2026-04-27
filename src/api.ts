import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

// ---- Types matching the backend ----

export type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  category: 'savory' | 'sweet' | string;
  price: string;        // e.g. "8.50"
};

export type Restaurant = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

export type OrderItem = {
  id: number;
  menuItemId: number;
  menuItemName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type Order = {
  id: number;
  restaurantId: number;
  customerName: string;
  customerEmail: string;
  status: 'received' | 'dispatched' | 'preparing' | 'ready' | 'served' | string;
  totalAmount: string;   // e.g. "17.00"
  createdAt: string;
  // items are not included in the current backend response (phase 2)
  items?: OrderItem[];
};

export type ApplicationCommand = {
  id: number;
  vehicleId: string;
  restaurantId: number;
  thresholdKm: number;
  status: 'pending' | 'dispatched';
  createdAt: string;
  dispatchedAt: string | null;
};

// ---- Helpers ----

/** Convert a price string like "8.50" to cents (850). */
export function priceToCents(price: string): number {
  return Math.round(parseFloat(price) * 100);
}

export function formatPrix(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

export function formatPrixStr(price: string): string {
  return formatPrix(priceToCents(price));
}

/** Map backend category values to French display labels. */
export const CATEGORY_LABELS: Record<string, string> = {
  savory: 'Crêpes salées',
  sweet: 'Crêpes sucrées',
};

export const STATUT_LABELS: Record<string, string> = {
  received: 'Reçue',
  dispatched: 'Transmise',
  preparing: 'En préparation',
  ready: 'Prête',
  served: 'Servie',
  cancelled: 'Annulée',
};

export const STATUT_PROGRESS: string[] = [
  'received',
  'dispatched',
  'preparing',
  'ready',
  'served',
];

// ---- API calls ----

export const api = {
  /** GET /api/restaurants/{id}/menu */
  getMenu: (restaurantId: number) =>
    request<{ restaurant: Restaurant; menu: MenuItem[] }>(
      `/restaurants/${restaurantId}/menu`,
    ),

  /** POST /api/restaurants/{id}/orders */
  createOrder: (
    restaurantId: number,
    customer: { name: string; email: string },
    items: Array<{ menuItemId: number; quantity: number }>,
  ) =>
    request<{ order: Order }>(`/restaurants/${restaurantId}/orders`, {
      method: 'POST',
      body: { customer, items },
    }),

  /** GET /api/restaurants/{restaurantId}/orders/{orderId} */
  getOrder: (restaurantId: number, orderId: number) =>
    request<{ order: Order }>(`/restaurants/${restaurantId}/orders/${orderId}`),

  /** PATCH /api/restaurants/{restaurantId}/orders/{orderId}/cancel */
  cancelOrder: (restaurantId: number, orderId: number) =>
    request<{ order: { id: number; status: string } }>(
      `/restaurants/${restaurantId}/orders/${orderId}/cancel`,
      { method: 'PATCH' },
    ),

  /**
   * POST /api/application/commands
   * Register a geo-triggered command: the backend will auto-place the order
   * once the vehicle is within thresholdKm of the restaurant.
   */
  registerCommand: (payload: {
    vehicleId: string;
    restaurantId: number;
    thresholdKm: number;
    orderPayload: {
      customer: { name: string; email: string };
      items: Array<{ menuItemId: number; quantity: number }>;
    };
  }) =>
    request<{ command: ApplicationCommand }>('/application/commands', {
      method: 'POST',
      body: payload,
    }),

  /**
   * POST /api/simulation/vehicle-position
   * Send the current GPS position of the vehicle.
   * The backend checks all pending commands for this vehicle and triggers
   * any whose restaurant is within the registered threshold.
   */
  updateVehiclePosition: (vehicleId: string, latitude: number, longitude: number) =>
    request<{ triggered: number[] }>('/simulation/vehicle-position', {
      method: 'POST',
      body: { vehicleId, latitude, longitude },
    }),
};
