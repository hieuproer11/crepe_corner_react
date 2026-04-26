import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, formatPrix, STATUT_LABELS, type Commande } from '../../src/api';
import { colors, radius, spacing } from '../../src/theme';

const STATUT_PROGRESS: string[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

export default function CommandeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const commandeId = Number(id);

  const [commande, setCommande] = useState<Commande | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const c = await api.getCommande(commandeId);
      setCommande(c);
    } catch (e: any) {
      setError(e.message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [commandeId]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh toutes les 10 secondes pour suivre le statut.
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

  if (error || !commande) {
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

  const currentStep = STATUT_PROGRESS.indexOf(commande.statut);

  return (
    <FlatList
      data={commande.lignes}
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
            <Text style={styles.commandeId}>Commande #{commande.id}</Text>
            <View style={styles.statutBadge}>
              <Text style={styles.statutBadgeText}>
                {STATUT_LABELS[commande.statut] ?? commande.statut}
              </Text>
            </View>
            <Text style={styles.date}>
              Passée le {new Date(commande.dateCommande).toLocaleString('fr-FR')}
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
          <Text style={styles.ligneQte}>{item.quantite}×</Text>
          <Text style={styles.ligneNom}>{item.produitNom}</Text>
          <Text style={styles.lignePrix}>{formatPrix(item.lineTotalCents)}</Text>
        </View>
      )}
      ListFooterComponent={
        <View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrix(commande.totalCents)}</Text>
          </View>

          <Pressable
            style={styles.btnSecondary}
            onPress={() => router.push('/scanner')}
          >
            <Text style={styles.btnSecondaryText}>Scanner un QR code</Text>
          </Pressable>

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
  date: { color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 },
  progressRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressDot: { width: 14, height: 14, borderRadius: 7, marginBottom: spacing.xs },
  progressLabel: { fontSize: 11, textAlign: 'center' },
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
  btnSecondary: {
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: { color: colors.primaryDark, fontWeight: '700' },
});
