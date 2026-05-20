// ChatScreen — Main UstaJi chat interface
// WhatsApp-style layout: header → message list → typing indicator → input
// Follows mobile-design skill: FlatList (not ScrollView), memoized items, min 44px targets

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  StatusBar,
  Text,
  Pressable,
  Alert,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../theme';
import { ChatMessage } from '../types/chat';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { apiService } from '../services/api';

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'agent',
  content: 'Assalam o Alaikum! 👋\n\nMain UstaJi hoon — aapka agentic service assistant. Koi bhi service chahiye — plumber, electrician, AC technician, tutor — bas batayein!\n\nMisaal ke tor par:\n"AC kharab ho gaya hai, G-11 mein kal subah koi chahiye"',
  timestamp: new Date(),
  traces: [],
};

const QUICK_REPLIES_INITIAL = [
  '🔧 Plumber chahiye',
  '⚡ Electrician',
  '❄️ AC repair',
  '📚 Tutor',
];

// Stage label mapping
const STAGE_LABELS: Record<string, string> = {
  initial: 'Ready',
  nlu_complete: 'Request Understood',
  matching_complete: 'Providers Found',
  pricing_complete: 'Pricing Ready',
  provider_selected: 'Provider Selected',
  booking_confirmed: 'Booking Confirmed',
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState('initial');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>(QUICK_REPLIES_INITIAL);
  const [altSlots, setAltSlots] = useState<{ date: string; start_time: string; provider_name: string }[]>([]);
  const listRef = useRef<FlatList>(null);

  // Check server connectivity on mount
  useEffect(() => {
    (async () => {
      const healthy = await apiService.checkHealth();
      setIsConnected(healthy);
    })();
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    scrollToBottom();
  }, [scrollToBottom]);

  const handleSend = useCallback(async (text: string) => {
    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    addMessage(userMsg);
    setIsLoading(true);
    setQuickReplies([]);

    try {
      const response = await apiService.sendMessage(text);

      // Map server field names → mobile type names
      // Server returns: reply, reasoning_traces, price_estimate, providers
      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: response.reply || response.message || 'Koi jawab nahi mila.',
        timestamp: new Date(),
        traces: response.reasoning_traces || response.traces || [],
        providers: (response.providers || []).map((p: any) => ({
          id: p.provider?.id || p.id || '',
          name: p.provider?.name || p.name || 'Unknown',
          service: p.provider?.service_types?.[0] || p.service || '',
          rating: p.provider?.stats?.avg_rating || p.rating || 0,
          reviews: p.provider?.stats?.total_reviews || p.reviews || 0,
          base_rate: p.provider?.base_rate || p.base_rate || 0,
          distance_km: p.estimated_distance_km ?? p.distance_km,
          match_score: (p.total_score || 0) / 100,
          available: p.provider?.availability?.available ?? p.available ?? true,
          location: p.provider?.location?.area || p.location || '',
        })),
        pricing: response.price_estimate ? {
          base_price: response.price_estimate.primary_quote?.base_rate || 0,
          final_price: response.price_estimate.primary_quote?.total || 0,
          currency: 'Rs.',
          breakdown: {
            base: response.price_estimate.primary_quote?.base_rate || 0,
            complexity_multiplier: response.price_estimate.primary_quote?.complexity_factor || 1,
            urgency_factor: response.price_estimate.primary_quote?.urgency_multiplier || 1,
            distance_charge: response.price_estimate.primary_quote?.distance_cost || 0,
          },
          alternative: response.price_estimate.budget_alternative ? {
            provider_name: response.price_estimate.budget_alternative.provider_name,
            price: response.price_estimate.budget_alternative.total,
          } : undefined,
        } : undefined,
        stage: response.stage,
      };

      addMessage(agentMsg);
      setStage(response.stage || 'initial');

      // Extract alternate scheduling slots
      const alts = response.scheduling?.alternatives || [];
      setAltSlots(alts.length > 0 ? alts : []);

      // Context-aware quick replies based on stage
      const s = response.stage || '';
      if (s === 'confirming') {
        setQuickReplies(['✅ Book karo', '🔄 Doosra provider', '❌ Cancel']);
      } else if (s === 'booked') {
        setQuickReplies(['📋 Booking details', '🆕 Naya kaam', '⭐ Rating do']);
        setAltSlots([]);
      } else if (s === 'clarifying') {
        setQuickReplies([]);
      } else {
        setQuickReplies([]);
      }

    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: isConnected === false
          ? '⚠️ Server offline. Terminal mein chalayein: cd server && npm run dev'
          : `⚠️ Kuch masla hua: ${error?.message || 'Unknown error'}. Dobara try karein.`,
        timestamp: new Date(),
      };
      addMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, isConnected]);

  const handleProviderSelect = useCallback((providerId: string) => {
    handleSend(`Provider ${providerId} select kiya`);
  }, [handleSend]);

  const handleReset = useCallback(() => {
    Alert.alert('Naya Session', 'Chat reset karein?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          apiService.resetSession();
          setMessages([WELCOME_MESSAGE]);
          setStage('initial');
          setQuickReplies(QUICK_REPLIES_INITIAL);
        },
      },
    ]);
  }, []);

  // FlatList renderItem — memoized per mobile-design skill
  const renderItem = useCallback(({ item }: { item: ChatMessage }) => (
    <ChatBubble message={item} onProviderSelect={handleProviderSelect} />
  ), [handleProviderSelect]);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg.primary} />

      {/* Header */}
      <View style={[styles.header, SHADOW.sm]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarEmoji}>🤖</Text>
            {isConnected !== null && (
              <View style={[styles.onlineDot, { backgroundColor: isConnected ? COLORS.success : COLORS.error }]} />
            )}
          </View>
          <View>
            <Text style={styles.headerName}>UstaJi</Text>
            <Text style={styles.headerStatus}>
              {isConnected === null ? 'Connecting...' : isConnected ? (STAGE_LABELS[stage] || 'Online') : 'Offline — Server not running'}
            </Text>
          </View>
        </View>
        <Pressable onPress={handleReset} style={styles.resetBtn} accessibilityRole="button" accessibilityLabel="Reset chat session">
          <Text style={styles.resetIcon}>↺</Text>
        </Pressable>
      </View>

      {/* Connection banner */}
      {isConnected === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            ⚠️  Server offline — run: <Text style={styles.offlineCode}>cd server && npm run dev</Text>
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list — FlatList per mobile-design skill (NOT ScrollView) */}
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          windowSize={5}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
          onContentSizeChange={scrollToBottom}
        />

        {/* Alternate time slots — shown after scheduling agent returns alternatives */}
        {altSlots.length > 0 && (
          <View style={styles.altSlotsBar}>
            <Text style={styles.altSlotsLabel}>🗓 Doosre available slots:</Text>
            <View style={styles.altSlotsList}>
              {altSlots.slice(0, 3).map((s, i) => (
                <Pressable
                  key={i}
                  style={styles.altSlotChip}
                  onPress={() => handleSend(`${s.date} ${s.start_time} wala slot chahiye`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select slot ${s.date} at ${s.start_time}`}
                >
                  <Text style={styles.altSlotTime}>{s.start_time}</Text>
                  <Text style={styles.altSlotDate}>{s.date?.slice(5)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Input bar */}
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          quickReplies={quickReplies}
          placeholder="Apna kaam batayein... (Urdu, Roman Urdu, English)"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg.primary },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerAvatar: { position: 'relative', width: 42, height: 42, borderRadius: RADIUS.full, backgroundColor: COLORS.bg.elevated, alignItems: 'center', justifyContent: 'center' },
  headerAvatarEmoji: { fontSize: 22 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORS.bg.secondary },
  headerName: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  headerStatus: { fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: 1 },
  resetBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: COLORS.bg.tertiary },
  resetIcon: { fontSize: 20, color: COLORS.text.secondary },
  offlineBanner: { backgroundColor: COLORS.error + '22', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.error + '33' },
  offlineText: { color: COLORS.error, fontSize: FONT.size.sm, textAlign: 'center' },
  offlineCode: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: COLORS.brand.amberLight },
  messageList: { flex: 1, backgroundColor: COLORS.bg.primary },
  messageContent: { paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  // ── Alternate slots bar ──────────────────────────────────────
  altSlotsBar: {
    backgroundColor: COLORS.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  altSlotsLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  altSlotsList: { flexDirection: 'row', gap: SPACING.sm },
  altSlotChip: {
    backgroundColor: COLORS.bg.elevated,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 64,
  },
  altSlotTime: { fontSize: FONT.size.sm, fontWeight: FONT.weight.bold, color: COLORS.text.primary },
  altSlotDate: { fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: 2 },
});
