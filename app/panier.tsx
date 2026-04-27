import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, formatPrixStr, priceToCents } from '../src/api';
import { useCart } from '../src/cart';
import { colors, radius, spacing } from '../src/theme';

const RESTAURANT_ID = 1;

export default function PanierScreen() {
  const router = useRouter();
  const { items, setQuantity, remove, totalCents, clear, restaurantId } = useCart();
  const [submitting, setSubmitting] = useState(false);

  // Customer info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const ridToUse = restaurantId ?? RESTAURANT_ID;

  const cartPayload = items.map((i) => ({
    menuItemId: i.menuItem.id,
    quantity: i.quantity,
  }));

  const customer = { name: name.trim(), email: email.trim() };

  const validate = (): boolean => {
    if (!customer.name) {
      Alert.alert('Champ manquant', 'Veuillez entrer votre nom.');
      return false;
    }
    if (!customer.email || !customer.email.includes('@')) {
      Alert.alert('Champ manquant', 'Veuillez entrer une adresse e-mail valide.');
      return false;
    }
    return true;
  };

  /** Passer la commande */
  const passerCommande = async () => {
    if (!validate() || items.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.createOrder(ridToUse, customer, cartPayload);
      await AsyncStorage.setItem('currentOrder', JSON.stringify({ orderId: res.order.id, restaurantId: ridToUse }));
      clear();
      router.replace(`/commande/${res.order.id}?restaurantId=${ridToUse}`);
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
    <FlatList
      data={items}
      keyExtractor={(i) => String(i.menuItem.id)}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 4 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={styles.itemName}>{item.menuItem.name}</Text>
            <Text style={styles.itemPrice}>{formatPrixStr(item.menuItem.price)}</Text>
          </View>
          <View style={styles.qtyRow}>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => setQuantity(item.menuItem.id, item.quantity - 1)}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => setQuantity(item.menuItem.id, item.quantity + 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => remove(item.menuItem.id)} style={{ marginLeft: spacing.sm }}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>Suppr.</Text>
          </Pressable>
        </View>
      )}
      ListFooterComponent={
        <View>
          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {(totalCents / 100).toFixed(2).replace('.', ',')} €
            </Text>
          </View>

          {/* Customer info */}
          <Text style={styles.sectionLabel}>Vos coordonnées</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom complet"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Adresse e-mail"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Immediate order */}
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
              <Text style={styles.primaryBtnText}>Commander maintenant</Text>
            )}
          </Pressable>

        </View>
      }
    />
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
  qtyText: {
    marginHorizontal: spacing.sm,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { fontSize: 18, fontWeight: '600', color: colors.text },
  totalValue: { fontSize: 22, fontWeight: '800', color: colors.primaryDark },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.textMuted,
    fontWeight: '600',
  },
  geoDesc: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  thresholdLabel: { color: colors.text, fontWeight: '600' },
  thresholdInput: {
    flex: 1,
    marginBottom: 0,
    textAlign: 'center',
  },
  secondaryBtn: {
    backgroundColor: colors.badgeBg,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  secondaryBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 16 },
});
