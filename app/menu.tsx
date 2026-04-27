import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, formatPrixStr, CATEGORY_LABELS, type MenuItem, type Restaurant } from '../src/api';
import { useCart } from '../src/cart';
import { colors, radius, spacing } from '../src/theme';

const RESTAURANT_ID = 1;

const CATEGORY_ORDER = ['savory', 'sweet'];

export default function MenuScreen() {
  const router = useRouter();
  const { add, items, totalCents, totalItems } = useCart();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await api.getMenu(RESTAURANT_ID);
      setRestaurant(res.restaurant);
      setMenu(res.menu);
    } catch (e: any) {
      setError(e.message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sections = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    for (const item of menu) {
      (groups[item.category] ??= []).push(item);
    }
    const flat: Array<
      { type: 'header'; title: string } | { type: 'item'; menuItem: MenuItem }
    > = [];

    // Show known categories first, then any others
    const orderedKeys = [
      ...CATEGORY_ORDER.filter((k) => groups[k]?.length),
      ...Object.keys(groups).filter((k) => !CATEGORY_ORDER.includes(k)),
    ];

    for (const cat of orderedKeys) {
      flat.push({ type: 'header', title: CATEGORY_LABELS[cat] ?? cat });
      for (const item of groups[cat]) flat.push({ type: 'item', menuItem: item });
    }
    return flat;
  }, [menu]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textMuted }}>
          Chargement du menu...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Oups !</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={sections}
        keyExtractor={(it) =>
          it.type === 'header' ? `h-${it.title}` : `p-${it.menuItem.id}`
        }
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
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
        ListHeaderComponent={
          restaurant ? (
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text style={styles.sectionHeader}>{item.title}</Text>;
          }
          const m = item.menuItem;
          const inCart = items.find((i) => i.menuItem.id === m.id)?.quantity ?? 0;
          return (
            <View style={styles.card}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={styles.itemName}>{m.name}</Text>
                {m.description ? (
                  <Text style={styles.itemDesc}>{m.description}</Text>
                ) : null}
                <Text style={styles.itemPrice}>{formatPrixStr(m.price)}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                onPress={() => add(m, RESTAURANT_ID)}
              >
                <Text style={styles.addBtnText}>
                  {inCart > 0 ? `+ (${inCart})` : '+ Ajouter'}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text
            style={{ textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl }}
          >
            Aucun produit disponible.
          </Text>
        }
      />

      {totalItems > 0 && (
        <Pressable style={styles.cartBar} onPress={() => router.push('/panier')}>
          <Text style={styles.cartBarText}>
            {totalItems} article{totalItems > 1 ? 's' : ''} •{' '}
            {(totalCents / 100).toFixed(2).replace('.', ',')} €
          </Text>
          <Text style={styles.cartBarCta}>Voir le panier ›</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  restaurantName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.text },
  itemDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: colors.primaryDark, marginTop: 6 },
  addBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
  cartBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cartBarText: { color: '#fff', fontWeight: '700' },
  cartBarCta: { color: '#fff', fontWeight: '700' },
  errorTitle: { fontSize: 22, fontWeight: '700', color: colors.danger, marginBottom: spacing.sm },
  errorMsg: { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
});
