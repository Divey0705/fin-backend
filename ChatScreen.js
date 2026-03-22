import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { sendChatMessage } from '../api/client';
import { useUser } from '../context/UserContext';

const BRAND = '#4F46E5';

const SUGGESTIONS = [
  'Why am I above peer average?',
  'How do I improve my score?',
  'Explain SIP investments',
  'How can I start saving?',
];

const INITIAL_MESSAGE = {
  id: '0',
  role: 'assistant',
  content: "Hi! I'm Fin AI, your personal finance advisor. I know your spending profile and can help with budgeting, savings, investments, and more. What would you like to know?",
};

export default function ChatScreen() {
  const { user } = useUser();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const listRef = useRef(null);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');

    const userMsg = { id: Date.now().toString(), role: 'user', content: q };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      // Build messages array (exclude the initial hardcoded greeting)
      const history = updated
        .filter(m => m.id !== '0')
        .map(m => ({ role: m.role, content: m.content }));

      const data = await sendChatMessage({
        user_id:        user?.user_id || '',
        messages:       history,
        monthly_income: user?.monthly_income || 0,
        health_score:   user?.health_score?.score || 0,
        predicted_spend: user?.budget_prediction?.predicted_spend || 0,
      });

      setMessages(prev => [...prev, {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: data.reply,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: 'Sorry, I ran into an error. Please try again.',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[s.bubble, item.role === 'user' ? s.userBubble : s.aiBubble]}>
      <Text style={[s.bubbleText, item.role === 'user' ? s.userText : s.aiText]}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>AI Finance Advisor</Text>
        <Text style={s.headerSub}>Powered by Groq · Knows your profile</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={s.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing indicator */}
      {loading && (
        <View style={[s.bubble, s.aiBubble, { margin: 12, marginBottom: 0 }]}>
          <ActivityIndicator size="small" color="#94A3B8" />
        </View>
      )}

      {/* Footer */}
      <View style={s.footer}>
        {/* Suggestions */}
        {messages.length <= 1 && (
          <View style={s.suggestions}>
            {SUGGESTIONS.map(sug => (
              <TouchableOpacity key={sug} style={s.suggestion} onPress={() => send(sug)}>
                <Text style={s.suggestionText}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input row */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Ask about your finances..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            editable={!loading}
            multiline
          />
          <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]} onPress={() => send()} disabled={!input.trim() || loading}>
            <Text style={s.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8FAFC' },
  header:       { backgroundColor: '#fff', padding: 16, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  headerSub:    { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  messageList:  { padding: 16, paddingBottom: 8 },
  bubble:       { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  userBubble:   { alignSelf: 'flex-end', backgroundColor: BRAND, borderBottomRightRadius: 4 },
  aiBubble:     { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 4 },
  bubbleText:   { fontSize: 14, lineHeight: 20 },
  userText:     { color: '#fff' },
  aiText:       { color: '#0F172A' },
  footer:       { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 12 },
  suggestions:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  suggestion:   { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  suggestionText: { fontSize: 12, color: '#64748B' },
  inputRow:     { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input:        { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100, color: '#0F172A' },
  sendBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  sendBtnText:  { color: '#fff', fontSize: 18, fontWeight: '700' },
});
