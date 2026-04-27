import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../src/theme';

type CurrentOrder = { orderId: number; restaurantId: number } | null;

export default function HomeScreen() {
  const router = useRouter();
  const [currentOrder, setCurrentOrder] = useState<CurrentOrder>(null);

  useEffect(() => {
    AsyncStorage.getItem('currentOrder').then((val) => {
      if (val) setCurrentOrder(JSON.parse(val));
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Crepe Corner</Text>
        <Text style={styles.subtitle}>
          Commandez vos crêpes préférées et suivez votre commande en direct.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => router.push('/menu')}
        >
          <Text style={styles.primaryBtnText}>Commander</Text>
        </Pressable>

        {currentOrder && (
          <Pressable
            style={({ pressed }) => [styles.orderBtn, pressed && styles.pressed]}
            onPress={() =>
              router.push(`/commande/${currentOrder.orderId}?restaurantId=${currentOrder.restaurantId}`)
            }
          >
            <Text style={styles.orderBtnText}>📦 Ma commande #{currentOrder.orderId}</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={() => router.push('/panier')}
        >
          <Text style={styles.secondaryBtnText}>Mon panier</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  hero: { paddingTop: spacing.xl * 2, alignItems: 'center' },
  title: { fontSize: 38, fontWeight: '800', color: colors.primaryDark, marginBottom: spacing.sm },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  actions: { gap: spacing.md, paddingBottom: spacing.xl },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  orderBtn: {
    backgroundColor: colors.primaryDark,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  orderBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: colors.card,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { color: colors.primaryDark, fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.sm },
  pressed: { opacity: 0.8 },
});
