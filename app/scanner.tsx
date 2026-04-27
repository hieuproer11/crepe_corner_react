import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../src/api';

const RESTAURANT_ID = 1;
import { colors, radius, spacing } from '../src/theme';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [working, setWorking] = useState(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Initialisation de la caméra…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Accès à la caméra</Text>
        <Text style={styles.subtitle}>
          Nous avons besoin d'accéder à votre caméra pour scanner les QR codes des commandes.
        </Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Autoriser la caméra</Text>
        </Pressable>
      </View>
    );
  }

  const handleScanned = async ({ data }: { data: string }) => {
    if (scanned || working) return;
    setScanned(true);
    setWorking(true);

    // Formats acceptés :
    //  - "12"                              -> ID brut
    //  - "commande:12"                     -> avec préfixe
    //  - "crepecorner://commande/12"       -> deep link
    //  - "http(s)://.../commandes/12"      -> URL
    let commandeId: number | null = null;
    const trimmed = data.trim();
    const numeric = trimmed.match(/(\d+)\s*$/);
    const fromPrefix = trimmed.match(/commande[s]?[:/](\d+)/i);
    if (fromPrefix) commandeId = Number(fromPrefix[1]);
    else if (numeric) commandeId = Number(numeric[1]);

    if (!commandeId || Number.isNaN(commandeId)) {
      Alert.alert('QR code invalide', `Contenu non reconnu :\n${data}`, [
        { text: 'Réessayer', onPress: () => setScanned(false) },
      ]);
      setWorking(false);
      return;
    }

    try {
      const res = await api.getOrder(RESTAURANT_ID, commandeId);
      router.replace(`/commande/${res.order.id}?restaurantId=${RESTAURANT_ID}`);
    } catch (e: any) {
      Alert.alert('Commande introuvable', e.message ?? 'Erreur', [
        { text: 'Réessayer', onPress: () => setScanned(false) },
      ]);
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Pointez la caméra vers un QR code de commande</Text>
      </View>

      {scanned && (
        <View style={styles.bottomBar}>
          <Pressable style={styles.btn} onPress={() => setScanned(false)}>
            <Text style={styles.btnText}>Scanner un autre code</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#fff',
    marginTop: spacing.lg,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    alignItems: 'center',
  },
});
