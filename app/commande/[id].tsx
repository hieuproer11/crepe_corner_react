import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  api,
  formatPrixStr,
  STATUT_LABELS,
  STATUT_PROGRESS,
  type Order,
} from '../../src/api';
import { colors, radius, spacing } from '../../src/theme';

const RESTAURANT_ID_DEFAULT = 1;

export default function CommandeScreen() {
  const { id, restaurantId } = useLocalSearchParams<{ id: string; restaurantId?: string }>();
  const router = useRouter();

  const orderId = Number(id);
  const restaurantIdNum = restaurantId ? Number(restaurantId) : RESTAURANT_ID_DEFAULT;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.getOrder(restaurantIdNum, orderId);
      setOrder(res.order);
    } catch (e: any) {
      setError(e.message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, restaurantIdNum]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 10 seconds to track status changes.
  useEffect(() => {
    const t = setInterval(() => {
      load();
    }, 10000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Commande introuvable</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <Pressable style={styles.btn} onPress={() => router.replace('/')}>
          <Text style={styles.btnText}>Retour à l'accueil</Text>
        </Pressable>
      </View>
    );
  }

  const currentStep = STATUT_PROGRESS.indexOf(order.status);

  const canCancel = !['ready', 'served', 'cancelled'].includes(order.status);

  const handleCancel = () => {
    Alert.alert(
      'Annuler la commande',
      'Êtes-vous sûr de vouloir annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await api.cancelOrder(restaurantIdNum, orderId);
              await AsyncStorage.removeItem('currentOrder');
              await load();
            } catch (e: any) {
              Alert.alert('Erreur', e.message ?? 'Impossible d\'annuler la commande.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  return (
    <FlatList
      data={order.items ?? []}
        keyExtractor={(l) => String(l.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      ListHeaderComponent={
        <View>
          <View style={styles.headerCard}>
            <Text style={styles.commandeId}>Commande #{order.id}</Text>
            <View style={styles.statutBadge}>
              <Text style={styles.statutBadgeText}>
                {STATUT_LABELS[order.status] ?? order.status}
              </Text>
            </View>
            <Text style={styles.customerName}>{order.customerName}</Text>
            <Text style={styles.date}>
              Passée le {new Date(order.createdAt).toLocaleString('fr-FR')}
            </Text>
          </View>

          <View style={styles.progressRow}>
            {STATUT_PROGRESS.map((s, i) => {
              const done = i <= currentStep;
              return (
                <View key={s} style={{ flex: 1, alignItems: 'center' }}>
                  <View
                    style={[
                      styles.progressDot,
                      { backgroundColor: done ? colors.primary : colors.border },
                    ]}
                  />
                  <Text
                    style={[
                      styles.progressLabel,
                      { color: done ? colors.primaryDark : colors.textMuted },
                    ]}
                  >
                    {STATUT_LABELS[s]}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Articles</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.ligne}>
          <Text style={styles.ligneQte}>{item.quantity}×</Text>
          <Text style={styles.ligneNom}>{item.menuItemName}</Text>
          <Text style={styles.lignePrix}>{formatPrixStr(item.lineTotal)}</Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: spacing.md }}>
          Le détail des articles sera disponible prochainement.
        </Text>
      }
      ListFooterComponent={
        <View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrixStr(order.totalAmount)}</Text>
          </View>

          {canCancel && (
            <Pressable
              style={({ pressed }) => [styles.btnCancel, (pressed || cancelling) && { opacity: 0.7 }]}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnCancelText}>Annuler la commande</Text>
              )}
            </Pressable>
          )}

          <Pressable style={styles.btn} onPress={() => router.replace('/')}>
            <Text style={styles.btnText}>Retour à l'accueil</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  headerCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  commandeId: { fontSize: 22, fontWeight: '800', color: colors.text },
  statutBadge: {
    backgroundColor: colors.badgeBg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    marginTop: spacing.sm,
  },
  statutBadgeText: { color: colors.primaryDark, fontWeight: '700' },
  customerName: { color: colors.text, marginTop: spacing.sm, fontWeight: '600' },
  date: { color: colors.textMuted, marginTop: spacing.xs, fontSize: 13 },
  progressRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressDot: { width: 14, height: 14, borderRadius: 7, marginBottom: spacing.xs },
  progressLabel: { fontSize: 10, textAlign: 'center' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  ligne: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ligneQte: { fontWeight: '800', color: colors.primaryDark, marginRight: spacing.md },
  ligneNom: { flex: 1, color: colors.text },
  lignePrix: { fontWeight: '700', color: colors.text },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { fontSize: 18, fontWeight: '600', color: colors.text },
  totalValue: { fontSize: 22, fontWeight: '800', color: colors.primaryDark },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  errorMsg: { fontSize: 14, color: colors.textMuted },
  btnCancel: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  btnCancelText: { color: '#fff', fontWeight: '700' },
});
