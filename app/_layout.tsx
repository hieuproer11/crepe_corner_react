import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from '../src/cart';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Crepe Corner' }} />
          <Stack.Screen name="menu" options={{ title: 'Menu' }} />
          <Stack.Screen name="panier" options={{ title: 'Mon panier' }} />
          <Stack.Screen name="commande/[id]" options={{ title: 'Ma commande' }} />
          <Stack.Screen name="scanner" options={{ title: 'Scanner un QR code' }} />
          <Stack.Screen name="trajet" options={{ title: 'En route…', headerBackVisible: false }} />
        </Stack>
      </CartProvider>
    </SafeAreaProvider>
  );
}
