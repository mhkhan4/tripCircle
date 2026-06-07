import { Stack } from 'expo-router';

export default function GroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerTintColor: '#2563EB',
        headerStyle: { backgroundColor: '#F8FAFC' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="[id]/add-member" options={{ presentation: 'modal', title: 'Add Member' }} />
    </Stack>
  );
}
