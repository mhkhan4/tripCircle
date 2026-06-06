import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useAppStore } from '../../../store/useAppStore';
import type { Message } from '../../../types';

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`group-chat-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `group_id=eq.${id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:users!sender_id(*)')
      .eq('group_id', id)
      .is('trip_id', null)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data as Message[]);
  }

  async function send() {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    await supabase.from('messages').insert({
      group_id: id,
      sender_id: user!.id,
      content,
      trip_id: null,
    });
  }

  function renderMessage({ item }: { item: Message }) {
    const isMe = item.sender_id === user?.id;
    return (
      <View className={`mb-2 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
        {!isMe && (
          <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
            <Text className="text-xs font-bold text-gray-600 dark:text-gray-300">
              {(item.sender as any)?.full_name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <View
          className={`max-w-xs rounded-2xl px-3 py-2 ${isMe ? 'rounded-tr-sm bg-primary' : 'rounded-tl-sm bg-white dark:bg-gray-800'}`}
          style={!isMe ? { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 } : {}}
        >
          {!isMe && (
            <Text className="mb-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
              {(item.sender as any)?.full_name?.split(' ')[0]}
            </Text>
          )}
          <Text className={`text-sm ${isMe ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>{item.content}</Text>
          <Text className={`mt-0.5 text-right text-xs ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
            {format(new Date(item.created_at), 'h:mm a')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Group Chat' }} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-gray-400">No messages yet. Say hello!</Text>
            </View>
          }
        />
        <View className="flex-row items-end gap-2 border-t border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor="#94A3B8"
            className="flex-1 rounded-2xl border border-gray-200 bg-slate-50 px-4 py-2 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            multiline
            maxLength={1000}
            style={{ maxHeight: 100 }}
          />
          <TouchableOpacity
            onPress={send}
            disabled={!text.trim()}
            className="h-10 w-10 items-center justify-center rounded-full bg-primary"
            style={{ opacity: text.trim() ? 1 : 0.5 }}
          >
            <Ionicons name="send" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
