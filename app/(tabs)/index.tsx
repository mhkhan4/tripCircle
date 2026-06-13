import { View, Text, Image, FlatList, TouchableOpacity, RefreshControl, ScrollView, useColorScheme, Modal, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { useGroups } from '../../hooks/useGroup';
import { useSoloTrips } from '../../hooks/useTrip';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../hooks/useTheme';
import type { Group, Trip } from '../../types';

// Centered SVG Gradient Cover component for trip cards
function TripCover({ title, destination }: { title: string; destination: string }) {
  const gradients = [
    { start: '#2563eb', end: '#7c3aed', icon: 'airplane-outline' as const },  // Royal Blue to Purple
    { start: '#ec4899', end: '#f43f5e', icon: 'compass-outline' as const },   // Pink to Rose
    { start: '#059669', end: '#10b981', icon: 'trail-sign-outline' as const }, // Emerald to Teal
    { start: '#d97706', end: '#f59e0b', icon: 'earth-outline' as const },       // Orange to Amber
    { start: '#0891b2', end: '#06b6d4', icon: 'map-outline' as const },         // Cyan to Light Cyan
    { start: '#4f46e5', end: '#6366f1', icon: 'boat-outline' as const },        // Indigo to Light Indigo
  ];

  const seed = destination || title || 'Trip';
  const hash = Math.abs(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const grad = gradients[hash % gradients.length];

  return (
    <View style={{ width: '100%', height: '100%', position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <SvgLinearGradient id={`grad-${hash}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={grad.start} />
            <Stop offset="100%" stopColor={grad.end} />
          </SvgLinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#grad-${hash})`} />
      </Svg>
      
      {/* Soft overlay circle + travel icon */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
        }}
      >
        <Ionicons name={grad.icon} size={18} color="white" />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useGroups();
  const { data: soloTrips, refetch: refetchSolo } = useSoloTrips();
  const [refreshing, setRefreshing] = useState(false);
  const [navMenuVisible, setNavMenuVisible] = useState(false);
  const { isDark } = useTheme();

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchGroups(), refetchSolo()]);
    setRefreshing(false);
  }

  const hasGroups = !!groups?.length;
  const hasSoloTrips = !!soloTrips?.length;
  const isEmpty = !hasGroups && !hasSoloTrips;

  const firstName = user?.full_name?.split(' ')[0] ?? 'Traveler';

  // Theme-dependent styles
  const bgMain = isDark ? '#120f1c' : '#f8fafc';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'rgba(30, 27, 43, 0.65)' : 'white';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const borderHeader = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const iconColor = isDark ? 'white' : '#0f172a';
  const pillBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const pillBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const subCardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const subCardBorder = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const mapDetailText = isDark ? '#e2e8f0' : '#334155';
  const ellipsisBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  
  function renderGroup({ item }: { item: Group }) {
    const letter = item.name[0].toUpperCase();
    const hues = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#7c3aed', '#06b6d4'];
    const color = hues[item.name.charCodeAt(0) % hues.length];
    const trips = (item as any).trips ?? [];

    return (
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 24,
          padding: 18,
          borderWidth: 1,
          borderColor: cardBorder,
          marginBottom: 16,
          shadowColor: isDark ? '#000' : '#0f172a',
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        {/* Group Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: trips.length > 0 ? 16 : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: 'white' }}>{letter}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className={`text-base font-bold ${textTitle}`}>{item.name}</Text>
              <Text className={`text-xs mt-0.5 ${textSub}`} numberOfLines={1}>
                {item.description || 'No description yet'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push(`/group/${item.id}`)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: ellipsisBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        </View>

        {/* Trips Horizontal List */}
        {trips.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {trips.map((trip: Trip) => {
              // Calculate progress bar and active color based on status
              let progressWidth = '30%';
              let statusLabel = 'Planning';
              let statusColor = '#3b82f6'; // blue
              if (trip.status === 'confirmed') {
                progressWidth = '60%';
                statusLabel = 'Confirmed';
                statusColor = '#a855f7'; // purple
              } else if (trip.status === 'ongoing') {
                progressWidth = '85%';
                statusLabel = 'Progress';
                statusColor = '#10b981'; // green
              } else if (trip.status === 'completed') {
                progressWidth = '100%';
                statusLabel = 'Completed';
                statusColor = '#10b981'; // green
              }

              return (
                <TouchableOpacity
                  key={trip.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/group/${item.id}/trip/${trip.id}`)}
                  style={{
                    width: 140,
                    borderRadius: 18,
                    overflow: 'hidden',
                    backgroundColor: subCardBg,
                    borderWidth: 1,
                    borderColor: subCardBorder,
                  }}
                >
                  {/* Trip Card Cover */}
                  <View style={{ height: 90, position: 'relative' }}>
                    {trip.cover_image ? (
                      <Image
                        source={{ uri: trip.cover_image }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <TripCover title={trip.title} destination={trip.destination} />
                    )}
                  </View>

                  {/* Trip Card Details */}
                  <View style={{ padding: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? 'white' : '#1e293b' }} numberOfLines={1}>
                      {trip.title}
                    </Text>

                    {/* Avatars & Progress Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 8 }}>
                      {/* Nested overlap avatars */}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#7c3aed', borderWidth: 1, borderColor: isDark ? '#1b1726' : 'white', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 8, fontWeight: 'bold', color: 'white' }}>{firstName[0].toUpperCase()}</Text>
                        </View>
                        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#0ea5e9', borderWidth: 1, borderColor: isDark ? '#1b1726' : 'white', marginLeft: -6, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 8, fontWeight: 'bold', color: 'white' }}>+</Text>
                        </View>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={{ height: 4, width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                      <View style={{ height: '100%', width: progressWidth as any, backgroundColor: statusColor }} />
                    </View>

                    <Text style={{ fontSize: 10, color: statusColor, fontWeight: '700' }}>
                      {statusLabel}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <TouchableOpacity
            onPress={() => router.push(`/group/${item.id}`)}
            activeOpacity={0.75}
            style={{
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
              borderRadius: 14,
              marginTop: 4,
            }}
          >
            <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', fontWeight: '500' }}>No trips planned yet. Tap to start.</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderSoloTripsAsGroupCard() {
    return (
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 24,
          padding: 18,
          borderWidth: 1,
          borderColor: cardBorder,
          marginBottom: 16,
          shadowColor: isDark ? '#000' : '#0f172a',
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        {/* Solo Trips Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: soloTrips!.length > 0 ? 16 : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: '#7c3aed',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person" size={20} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text className={`text-base font-bold ${textTitle}`}>Solo Trips</Text>
              <Text className={`text-xs mt-0.5 ${textSub}`}>
                Your personal adventures and itineraries
              </Text>
            </View>
          </View>
        </View>

        {/* Solo Trips Horizontal List */}
        {soloTrips && soloTrips.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {soloTrips.map((trip: Trip) => {
              // Calculate progress bar and active color based on status
              let progressWidth = '30%';
              let statusLabel = 'Planning';
              let statusColor = '#3b82f6'; // blue
              if (trip.status === 'confirmed') {
                progressWidth = '60%';
                statusLabel = 'Confirmed';
                statusColor = '#a855f7'; // purple
              } else if (trip.status === 'ongoing') {
                progressWidth = '85%';
                statusLabel = 'Progress';
                statusColor = '#10b981'; // green
              } else if (trip.status === 'completed') {
                progressWidth = '100%';
                statusLabel = 'Completed';
                statusColor = '#10b981'; // green
              }

              return (
                <TouchableOpacity
                  key={trip.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/trip/${trip.id}`)}
                  style={{
                    width: 140,
                    borderRadius: 18,
                    overflow: 'hidden',
                    backgroundColor: subCardBg,
                    borderWidth: 1,
                    borderColor: subCardBorder,
                  }}
                >
                  {/* Trip Card Cover */}
                  <View style={{ height: 90, position: 'relative' }}>
                    {trip.cover_image ? (
                      <Image
                        source={{ uri: trip.cover_image }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <TripCover title={trip.title} destination={trip.destination} />
                    )}
                  </View>

                  {/* Trip Card Details */}
                  <View style={{ padding: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? 'white' : '#1e293b' }} numberOfLines={1}>
                      {trip.title}
                    </Text>

                    {/* Avatars & Progress Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 8 }}>
                      {/* Solo traveler avatar */}
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 8, fontWeight: 'bold', color: 'white' }}>{firstName[0].toUpperCase()}</Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={{ height: 4, width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                      <View style={{ height: '100%', width: progressWidth as any, backgroundColor: statusColor }} />
                    </View>

                    <Text style={{ fontSize: 10, color: statusColor, fontWeight: '700' }}>
                      {statusLabel}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/trip/new')}
            activeOpacity={0.75}
            style={{
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
              borderRadius: 14,
              marginTop: 4,
            }}
          >
            <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', fontWeight: '500' }}>No trips planned yet. Tap to start.</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgMain }}>
      {/* Ambient Glow Blobs (Visible in Dark Mode for Premium Aesthetics) */}
      {isDark && (
        <>
          <View style={{ position: 'absolute', top: -100, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: '#3b82f6', opacity: 0.12 }} />
          <View style={{ position: 'absolute', top: 250, right: -100, width: 280, height: 280, borderRadius: 140, backgroundColor: '#7c3aed', opacity: 0.1 }} />
          <View style={{ position: 'absolute', bottom: 100, left: -80, width: 250, height: 250, borderRadius: 125, backgroundColor: '#ec4899', opacity: 0.08 }} />
        </>
      )}

      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: borderHeader,
        }}
      >
        {/* Left: Menu Icon (Three-lines menu) */}
        <TouchableOpacity
          onPress={() => setNavMenuVisible(true)}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="menu" size={24} color={iconColor} />
        </TouchableOpacity>

        {/* Center: Brand Logo & Wordmark */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
          <Text style={{ fontSize: 19, fontWeight: '800', color: isDark ? 'white' : '#0f172a', letterSpacing: 0.2 }}>
            TripOrbit
          </Text>
        </View>

        {/* Right: User Profile Pill */}
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: pillBg,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 20,
            gap: 8,
            borderWidth: 1,
            borderColor: pillBorder,
          }}
        >
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={{ width: 26, height: 26, borderRadius: 13 }} />
          ) : (
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{firstName[0].toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text style={{ color: isDark ? 'white' : '#0f172a', fontSize: 11, fontWeight: '700' }}>
              {firstName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22c55e' }} />
              <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 8, fontWeight: '600' }}>
                Status
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      {groupsLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading...</Text>
        </View>
      ) : isEmpty ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Illustration */}
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: 200, height: 145 }}
              resizeMode="contain"
            />
          </View>

          {/* Tagline */}
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text className={`text-center text-3xl font-extrabold tracking-tight ${textTitle}`} style={{ lineHeight: 40 }}>
              Plan trips together,{'\n'}effortlessly.
            </Text>
            <Text className={`mt-3 text-center text-sm leading-relaxed ${textSub}`}>
              From idea to itinerary — group adventures{'\n'}and solo getaways, all in one place.
            </Text>
          </View>

          {/* Section divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 40, gap: 10 }}>
            <View className="flex-1" style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
            <Text className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Get Started Below
            </Text>
            <View className="flex-1" style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={groups ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? 'white' : '#0f172a'} />}
          ListHeaderComponent={
            hasGroups ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: '#3b82f6' }} />
                <Text className="text-sm font-bold uppercase tracking-widest text-slate-400">
                  Groups
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            hasSoloTrips ? (
              <View style={{ marginTop: 8 }}>
                {renderSoloTripsAsGroupCard()}
                <View style={{ height: 110 }} />
              </View>
            ) : (
              <View style={{ height: 110 }} />
            )
          }
        />
      )}

      {/* Floating Bottom Action Bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 24,
          left: 20,
          right: 20,
          flexDirection: 'row',
          backgroundColor: isDark ? 'rgba(15, 11, 26, 0.9)' : 'rgba(255,255,255,0.92)',
          borderRadius: 28,
          padding: 6,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push('/group/new')}
          activeOpacity={0.8}
          style={{
            flex: 1,
            flexDirection: 'row',
            backgroundColor: isDark ? 'white' : '#0f172a',
            height: 46,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginRight: 6,
          }}
        >
          <Ionicons name="apps-outline" size={15} color={isDark ? 'black' : 'white'} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? 'black' : 'white', letterSpacing: 0.5 }}>
            CREATE A GROUP
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/trip/new')}
          activeOpacity={0.8}
          style={{
            flex: 1,
            flexDirection: 'row',
            backgroundColor: '#7c3aed',
            height: 46,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginLeft: 6,
          }}
        >
          <Ionicons name="compass" size={15} color="white" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: 'white', letterSpacing: 0.5 }}>
            PLAN A SOLO TRIP
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Top-Left Navigation Dropdown Menu Modal ── */}
      <Modal
        visible={navMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNavMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setNavMenuVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
            <View
              style={{
                position: 'absolute',
                top: 60,
                left: 16,
                backgroundColor: isDark ? '#1e1b29' : 'white',
                borderRadius: 20,
                padding: 12,
                width: 200,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                shadowColor: '#000',
                shadowOpacity: 0.25,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 5,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 8 }}>
                Navigation
              </Text>

              {/* Menu Item: Groups (Active) */}
              <TouchableOpacity
                onPress={() => {
                  setNavMenuVisible(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                }}
              >
                <Ionicons name="people" size={18} color="#3b82f6" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? 'white' : '#0f172a' }}>
                  Groups & Trips
                </Text>
              </TouchableOpacity>

              {/* Menu Item: Calendar */}
              <TouchableOpacity
                onPress={() => {
                  setNavMenuVisible(false);
                  router.push('/calendar');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  marginTop: 4,
                }}
              >
                <Ionicons name="calendar-outline" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#e2e8f0' : '#334155' }}>
                  Plan Calendar
                </Text>
              </TouchableOpacity>


            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
