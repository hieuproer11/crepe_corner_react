import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../src/api';
import { colors, radius, spacing } from '../src/theme';

type TrajetStatus =
  | 'requesting_permission'
  | 'tracking'
  | 'triggered'
  | 'error';

export default function TrajetScreen() {
  const { vehicleId, restaurantId } = useLocalSearchParams<{
    vehicleId: string;
    restaurantId?: string;
  }>();
  const router = useRouter();

  const [status, setStatus] = useState<TrajetStatus>('requesting_permission');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [triggeredOrderId, setTriggeredOrderId] = useState<number | null>(null);
  const [lastPosition, setLastPosition] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const restaurantIdNum = restaurantId ? Number(restaurantId) : 1;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const sendPosition = async (lat: number, lon: number) => {
    try {
      const res = await api.updateVehiclePosition(vehicleId, lat, lon);
      if (res.triggered && res.triggered.length > 0) {
        // Backend triggered an order — stop tracking and show confirmation.
        stopTracking();
        setTriggeredOrderId(res.triggered[0]);
        setStatus('triggered');
      }
    } catch {
      // Silently ignore transient network errors during tracking.
    }
  };

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const { status: permStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (permStatus !== 'granted') {
        setErrorMsg("L'accès à la localisation a été refusé.");
        setStatus('error');
        return;
      }

      setStatus('tracking');

      // Send position immediately, then every 5 seconds.
      const doSend = async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (cancelled) return;
          const lat = loc.coords.latitude;
          const lon = loc.coords.longitude;
          setLastPosition({ lat, lon });
          await sendPosition(lat, lon);
        } catch (e: any) {
          if (!cancelled) {
            setErrorMsg(e.message ?? 'Erreur de localisation');
            setStatus('error');
            stopTracking();
          }
        }
      };

      await doSend();
      intervalRef.current = setInterval(doSend, 5000);
    };

    start();

    return () => {
      cancelled = true;
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  // ---- Permission request screen ----
  if (status === 'requesting_permission') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.hint}>Demande d'accès à la localisation…</Text>
      </View>
    );
  }

  // ---- Error screen ----
  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Erreur de localisation</Text>
        <Text style={styles.errorMsg}>{errorMsg}</Text>
        <Pressable style={styles.btn} onPress={() => router.replace('/')}>
          <Text style={styles.btnText}>Retour à l'accueil</Text>
        </Pressable>
      </View>
    );
  }

  // ---- Order triggered screen ----
  if (status === 'triggered' && triggeredOrderId !== null) {
    return (
      <View style={styles.center}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Commande lancée !</Text>
          <Text style={styles.successDesc}>
            Vous êtes à proximité du restaurant. Votre commande est en cours de
            préparation.
          </Text>
        </View>
        <Pressable
          style={styles.btn}
          onPress={() =>
            router.replace(
              `/commande/${triggeredOrderId}?restaurantId=${restaurantIdNum}`,
            )
          }
        >
          <Text style={styles.btnText}>Suivre ma commande</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={() => router.replace('/')}>
          <Text style={styles.btnSecondaryText}>Retour à l'accueil</Text>
        </Pressable>
      </View>
    );
  }

  // ---- Tracking screen ----
  return (
    <View style={styles.center}>
      <View style={styles.trackingCard}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.trackingTitle}>En route…</Text>
        <Text style={styles.trackingDesc}>
          Votre position est surveillée. La commande sera déclenchée
          automatiquement à l'approche du restaurant.
        </Text>
        {lastPosition && (
          <Text style={styles.coords}>
            {lastPosition.lat.toFixed(5)}, {lastPosition.lon.toFixed(5)}
          </Text>
        )}
      </View>

      <Pressable
        style={styles.btnSecondary}
        onPress={() => {
          stopTracking();
          router.replace('/');
        }}
      >
        <Text style={styles.btnSecondaryText}>Annuler le trajet</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  hint: { marginTop: spacing.md, color: colors.textMuted },
  trackingCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    width: '100%',
  },
  trackingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.md,
  },
  trackingDesc: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  coords: {
    marginTop: spacing.md,
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.textMuted,
  },
  successCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success,
    marginBottom: spacing.lg,
    width: '100%',
  },
  successIcon: {
    fontSize: 48,
    color: colors.success,
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.success,
    marginTop: spacing.sm,
  },
  successDesc: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  errorMsg: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.sm,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnSecondary: {
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    marginTop: spacing.sm,
  },
  btnSecondaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 16 },
});
