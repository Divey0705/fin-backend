// ─────────────────────────────────────────────────
// SocialScreen.js
// ─────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { getFeed, createPost, likePost } from '../api/client';
import { useUser } from '../context/UserContext';

const BRAND = '#4F46E5';

const BADGE_COLORS = {
  offer: { bg: '#ECFDF5', text: '#059669' },
  study: { bg: '#EEF2FF', text: '#4F46E5' },
  'lost & found': { bg: '#FFFBEB', text: '#D97706' },
  general: { bg: '#F1F5F9', text: '#64748B' },
};

export function SocialScreen() {
  const { user } = useUser();
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [posting, setPosting]   = useState(false);
  const [content, setContent]   = useState('');
  const [tag, setTag]           = useState('Offer');
  const [filter, setFilter]     = useState('all');

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getFeed({ limit: 30, tag: filter === 'all' ? undefined : filter });
      setPosts(data.posts || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handlePost = async () => {
    if (!content.trim()) { Alert.alert('Write something first'); return; }
    setPosting(true);
    try {
      await createPost({ user_id: user.user_id, content, tag });
      setContent('');
      await load();
    } catch (e) { Alert.alert('Error', e.response?.data?.detail || 'Could not post'); }
    finally { setPosting(false); }
  };

  const handleLike = async (post, index) => {
    try {
      const data = await likePost(post.post_id, user.user_id);
      const updated = [...posts];
      updated[index] = { ...post, likes: data.likes };
      setPosts(updated);
    } catch { /* silent */ }
  };

  const tags = ['Offer', 'Study', 'Lost & found', 'General'];
  const filters = [['all', 'All'], ['offer', 'Offers'], ['study', 'Study'], ['lost & found', 'Lost & found']];

  return (
    <View style={ss.container}>
      <View style={ss.header}>
        <Text style={ss.title}>Community Feed</Text>
        <Text style={ss.sub}>Posts from people nearby</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item, i) => item.post_id || i.toString()}
        contentContainerStyle={{ padding: 12 }}
        ListHeaderComponent={
          <View>
            {/* Compose */}
            <View style={ss.composeBox}>
              <TextInput style={ss.composeInput} placeholder="Share an offer, tip, or anything nearby..." value={content} onChangeText={setContent} multiline />
              <View style={ss.composeFooter}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {tags.map(t => (
                      <TouchableOpacity key={t} style={[ss.chip, tag === t && ss.chipActive]} onPress={() => setTag(t)}>
                        <Text style={[ss.chipText, tag === t && ss.chipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <TouchableOpacity style={ss.postBtn} onPress={handlePost} disabled={posting}>
                  {posting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={ss.postBtnText}>Post</Text>}
                </TouchableOpacity>
              </View>
            </View>
            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {filters.map(([val, label]) => (
                  <TouchableOpacity key={val} style={[ss.chip, filter === val && ss.chipActive]} onPress={() => setFilter(val)}>
                    <Text style={[ss.chipText, filter === val && ss.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        }
        renderItem={({ item, index }) => {
          const tagKey = (item.tag || 'general').toLowerCase();
          const bc = BADGE_COLORS[tagKey] || BADGE_COLORS.general;
          return (
            <View style={ss.postCard}>
              <View style={ss.postHeader}>
                <View style={ss.avatar}><Text style={ss.avatarText}>{item.initials || '??'}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={ss.author}>{item.author}</Text>
                  <Text style={ss.meta}>{item.distance_km != null ? `${item.distance_km} km · ` : ''}{item.time_label}</Text>
                </View>
                <View style={[ss.badge, { backgroundColor: bc.bg }]}>
                  <Text style={[ss.badgeText, { color: bc.text }]}>{item.tag}</Text>
                </View>
              </View>
              <Text style={ss.postBody}>{item.content}</Text>
              <View style={ss.postActions}>
                <TouchableOpacity style={ss.actionBtn} onPress={() => handleLike(item, index)}>
                  <Text style={ss.actionText}>👍 {item.likes || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ss.actionBtn}>
                  <Text style={ss.actionText}>💬 {item.comments || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={loading ? <ActivityIndicator color={BRAND} style={{ marginTop: 32 }} /> : <Text style={ss.emptyText}>No posts yet. Be the first!</Text>}
        refreshing={loading}
        onRefresh={load}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F1F5F9' },
  header:        { backgroundColor: '#fff', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title:         { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  sub:           { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  composeBox:    { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  composeInput:  { fontSize: 14, color: '#0F172A', minHeight: 56, textAlignVertical: 'top' },
  composeFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10 },
  chip:          { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipActive:    { backgroundColor: BRAND, borderColor: BRAND },
  chipText:      { fontSize: 12, color: '#64748B' },
  chipTextActive:{ color: '#fff' },
  postBtn:       { backgroundColor: BRAND, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7 },
  postBtnText:   { color: '#fff', fontWeight: '600', fontSize: 13 },
  postCard:      { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  postHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: 13, fontWeight: '600', color: BRAND },
  author:        { fontSize: 13, fontWeight: '500', color: '#0F172A' },
  meta:          { fontSize: 11, color: '#94A3B8' },
  badge:         { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText:     { fontSize: 11, fontWeight: '500' },
  postBody:      { fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 12 },
  postActions:   { flexDirection: 'row', gap: 8 },
  actionBtn:     { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  actionText:    { fontSize: 12, color: '#64748B' },
  emptyText:     { textAlign: 'center', color: '#94A3B8', marginTop: 32 },
});

// ─────────────────────────────────────────────────
// BudgetScreen.js
// ─────────────────────────────────────────────────
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useUser } from '../context/UserContext';

const fmt = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

export function BudgetScreen() {
  const { user } = useUser();
  const split = user?.budget_prediction?.budget_split || {};
  const income = user?.monthly_income || 0;

  const categories = [
    { key: 'food',          label: 'Food',          color: '#4F46E5' },
    { key: 'rent',          label: 'Rent',          color: '#059669' },
    { key: 'transport',     label: 'Transport',     color: '#D97706' },
    { key: 'entertainment', label: 'Entertainment', color: '#DB2777' },
    { key: 'shopping',      label: 'Shopping',      color: '#8B5CF6' },
    { key: 'others',        label: 'Others',        color: '#94A3B8' },
  ];

  return (
    <ScrollView style={bs.container}>
      <View style={bs.header}>
        <Text style={bs.title}>Budget Planner</Text>
        <Text style={bs.sub}>AI-suggested monthly budget</Text>
      </View>
      <View style={bs.card}>
        <Text style={bs.cardTitle}>Suggested budget split</Text>
        {categories.map(cat => {
          const data = split[cat.key];
          if (!data) return null;
          const pct = data.pct || 0;
          const amt = data.amount || 0;
          return (
            <View key={cat.key} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '500' }}>{cat.label}</Text>
                <Text style={{ fontSize: 12, color: '#64748B' }}>{pct}% · {fmt(amt)}</Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: cat.color, borderRadius: 4 }} />
              </View>
            </View>
          );
        })}
        <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: '#64748B' }}>Monthly income</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{fmt(income)}</Text>
        </View>
      </View>
      <View style={[bs.card, { backgroundColor: '#EEF2FF', borderColor: 'rgba(79,70,229,.2)' }]}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#4F46E5', marginBottom: 6 }}>💡 50/30/20 rule</Text>
        <Text style={{ fontSize: 13, color: '#3730A3', lineHeight: 20 }}>
          Needs (rent, food, transport): {fmt(income * 0.5)}{'\n'}
          Wants (entertainment, shopping): {fmt(income * 0.3)}{'\n'}
          Savings & investments: {fmt(income * 0.2)}
        </Text>
      </View>
    </ScrollView>
  );
}

const bs = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header:    { backgroundColor: '#fff', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title:     { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  sub:       { fontSize: 13, color: '#64748B', marginTop: 2 },
  card:      { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
});

// ─────────────────────────────────────────────────
// ProgressScreen.js
// ─────────────────────────────────────────────────
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useUser } from '../context/UserContext';

export function ProgressScreen() {
  const { user } = useUser();
  const score     = user?.health_score?.score || 0;
  const breakdown = user?.health_score?.breakdown || {};
  const snapshot  = user?.profile_snapshot || [];

  const dims = [
    { key: 'track_expenses',   label: 'Track expenses',   max: 20 },
    { key: 'borrow_often',     label: 'No borrowing',     max: 25 },
    { key: 'know_budgeting',   label: 'Know budgeting',   max: 15 },
    { key: 'know_investments', label: 'Know investments', max: 15 },
    { key: 'save_regularly',   label: 'Save regularly',   max: 25 },
  ];

  return (
    <ScrollView style={ps.container}>
      <View style={ps.header}>
        <Text style={ps.title}>Financial Progress</Text>
        <Text style={ps.sub}>Your improvement over time</Text>
      </View>

      {/* Score card */}
      <View style={[ps.card, { backgroundColor: '#4F46E5' }]}>
        <Text style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginBottom: 4 }}>Current health score</Text>
        <Text style={{ color: '#fff', fontSize: 48, fontWeight: '800' }}>{score}</Text>
        <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: 14 }}>/100</Text>
        <View style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,.15)', borderRadius: 20, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '500' }}>{user?.health_score?.label || 'Getting Started'}</Text>
        </View>
      </View>

      {/* Dimension breakdown */}
      <View style={ps.card}>
        <Text style={ps.cardTitle}>Score breakdown</Text>
        {dims.map(dim => {
          const info = breakdown[dim.key] || {};
          const earned = info.earned || 0;
          const pct = (earned / dim.max) * 100;
          return (
            <View key={dim.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Text style={{ width: 140, fontSize: 13, color: '#0F172A' }}>{dim.label}</Text>
              <View style={{ flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${pct}%`, backgroundColor: pct === 100 ? '#059669' : '#4F46E5', borderRadius: 3 }} />
              </View>
              <View style={{ backgroundColor: pct === 100 ? '#ECFDF5' : '#F1F5F9', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '500', color: pct === 100 ? '#059669' : '#94A3B8' }}>{earned}/{dim.max}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* History */}
      {snapshot.length > 0 && (
        <View style={ps.card}>
          <Text style={ps.cardTitle}>Score history</Text>
          {[...snapshot].reverse().map((entry, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < snapshot.length - 1 ? 1 : 0, borderBottomColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 13, color: '#64748B' }}>{entry.date}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{entry.score}/100</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const ps = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header:    { backgroundColor: '#fff', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title:     { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  sub:       { fontSize: 13, color: '#64748B', marginTop: 2 },
  card:      { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
});

// ─────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────
export default SocialScreen;
