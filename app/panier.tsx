import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, formatPrix } from '../src/api';
import { useCart } from '../src/cart';
import { colors, radius, spacing } from '../src/theme';

export default function PanierScreen() {
  const router = useRouter();
  const { items, setQuantite, remove, totalCents, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const passerCommande = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const commande = await api.createCommande(
        1,
        items.map((i) => ({ produitId: i.produit.id, quantite: i.quantite })),
      );
      clear();
      router.replace(`/commande/${commande.id}`);
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Impossible de passer la commande.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Votre panier est vide</Text>
        <Text style={styles.emptySubtitle}>Ajoutez des produits depuis le menu.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/menu')}>
          <Text style={styles.primaryBtnText}>Voir le menu</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.produit.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.itemName}>{item.produit.nom}</Text>
              <Text style={styles.itemPrice}>{formatPrix(item.produit.prixCents)}</Text>
            </View>
            <View style={styles.qtyRow}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setQuantite(item.produit.id, item.quantite - 1)}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qtyText}>{item.quantite}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setQuantite(item.produit.id, item.quantite + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => remove(item.produit.id)} style={{ marginLeft: spacing.sm }}>
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Suppr.</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrix(totalCents)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            (pressed || submitting) && { opacity: 0.7 },
          ]}
          disabled={submitting}
          onPress={passerCommande}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Passer la commande</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  emptySubtitle: { color: colors.textMuted, marginBottom: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemName: { fontWeight: '600', color: colors.text, fontSize: 15 },
  itemPrice: { color: colors.primaryDark, marginTop: 2, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    backgroundColor: colors.badgeBg,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  qtyText: { marginHorizontal: spacing.sm, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  totalLabel: { fontSize: 18, fontWeight: '600', color: colors.text },
  totalValue: { fontSize: 22, fontWeight: '800', color: colors.primaryDark },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
