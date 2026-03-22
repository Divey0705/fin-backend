import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useUser } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';

const BRAND = '#4F46E5';
const fmt = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

function MetricCard({ label, value, note, delta, deltaUp }) {
  return (
    <View style={s.metricCard}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
      {note  && <Text style={s.metricNote}>{note}</Text>}
      {delta && <Text style={[s.metricDelta, { color: deltaUp ? '#059669' : '#DC2626' }]}>{delta}</Text>}
    </View>
  );
}

function BudgetBar({ label, pct, amount, color }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={s.budgetRowTop}>
        <Text style={s.budgetLabel}>{label}</Text>
        <Text style={s.budgetVals}>{pct}% · {fmt(amount)}</Text>
      </View>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ScoreRing({ score }) {
  const color = score >= 80 ? '#34D399' : score >= 60 ? '#FCD34D' : '#FC8181';
  const label = score >= 80 ? 'Financial Champion 🏆' : score >= 60 ? 'Getting There 📈' : score >= 40 ? 'Needs Attention ⚠️' : 'At Risk 🚨';
  return (
    <View style={s.scoreWrap}>
      <View style={s.scoreRing}>
        <Text style={[s.scoreNum, { color }]}>{score}</Text>
        <Text style={s.scoreDenom}>/100</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.scoreTitle}>Financial health score</Text>
        <Text style={s.scoreSubtitle}>Your financial fitness level</Text>
        <View style={[s.scoreBadge, { backgroundColor: color + '30' }]}>
          <Text style={[s.scoreBadgeText, { color }]}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, logout } = useUser();
  const navigation = useNavigation();

  if (!user) return null;

  const score  = user.health_score?.score || 0;
  const bp     = user.budget_prediction  || {};
  const pb     = user.peer_benchmark     || {};
  const split  = bp.budget_split         || {};
  const diff   = (bp.predicted_spend || 0) - (pb.cohort_avg || 0);
  const firstName = (user.name || '').split(' ')[0];

  const budgetBars = [
    { label: 'Food',          key: 'food',          color: BRAND },
    { label: 'Rent',          key: 'rent',          color: '#059669' },
    { label: 'Transport',     key: 'transport',     color: '#D97706' },
    { label: 'Entertainment', key: 'entertainment', color: '#DB2777' },
    { label: 'Others',        key: 'others',        color: '#94A3B8' },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Hi, {firstName} 👋</Text>
          <Text style={s.subGreeting}>Here's your financial snapshot</Text>
        </View>
        <TouchableOpacity style={s.avatar} onPress={logout}>
          <Text style={s.avatarText}>{user.initials || 'FN'}</Text>
        </TouchableOpacity>
      </View>

      {/* Health Score */}
      <View style={s.card}>
        <ScoreRing score={score} />
        <View style={s.scoreActions}>
          <TouchableOpacity style={s.scoreBtn} onPress={() => navigation.navigate('Progress')}>
            <Text style={s.scoreBtnText}>View progress →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.scoreBtn} onPress={() => navigation.navigate('Chat')}>
            <Text style={s.scoreBtnText}>Ask AI advisor</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Metrics */}
      <View style={s.grid2}>
        <MetricCard label="Predicted spend" value={fmt(bp.predicted_spend)} note="this month" />
        <MetricCard label="Peer cohort avg" value={fmt(pb.cohort_avg)} note={pb.cohort}
          delta={diff > 0 ? `You spend ${Math.abs(Math.round(diff / (pb.cohort_avg || 1) * 100))}% more` : `${Math.abs(Math.round(diff / (pb.cohort_avg || 1) * 100))}% under avg`}
          deltaUp={diff <= 0}
        />
        <MetricCard label="Monthly income" value={fmt(user.monthly_income)} note="current month" />
        <MetricCard label="Savings potential" value={fmt(bp.savings_potential)}
          note={bp.savings_potential > 0 ? 'this month' : 'in deficit'}
          delta={bp.savings_potential > 0 ? `+${bp.savings_rate_pct}% of income` : 'Overspending'}
          deltaUp={bp.savings_potential > 0}
        />
      </View>

      {/* Budget split */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Suggested budget split</Text>
        {budgetBars.map(bar => split[bar.key] ? (
          <BudgetBar key={bar.key} label={bar.label} pct={split[bar.key].pct || 0} amount={split[bar.key].amount || 0} color={bar.color} />
        ) : null)}
      </View>

      {/* Action steps */}
      {(user.health_score?.action_steps || []).length > 0 && (
        <View style={[s.card, { backgroundColor: '#FFFBEB', borderColor: 'rgba(217,119,6,.2)' }]}>
          <Text style={[s.sectionTitle, { color: '#D97706' }]}>⚠ Action needed</Text>
          {user.health_score.action_steps.map((tip, i) => (
            <Text key={i} style={{ fontSize: 13, color: '#92400E', marginBottom: 4, lineHeight: 20 }}>• {tip}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F1F5F9' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  greeting:     { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  subGreeting:  { fontSize: 13, color: '#64748B', marginTop: 2 },
  avatar:       { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 14, fontWeight: '700', color: BRAND },
  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 16, margin: 12, marginBottom: 0, borderWidth: 1, borderColor: '#E2E8F0' },
  scoreWrap:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreRing:    { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  scoreNum:     { fontSize: 26, fontWeight: '800' },
  scoreDenom:   { fontSize: 11, color: '#94A3B8' },
  scoreTitle:   { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  scoreSubtitle:{ fontSize: 12, color: '#64748B', marginTop: 2 },
  scoreBadge:   { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  scoreBadgeText: { fontSize: 12, fontWeight: '500' },
  scoreActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  scoreBtn:     { flex: 1, borderWidth: 1, borderColor: BRAND, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  scoreBtnText: { fontSize: 12, color: BRAND, fontWeight: '500' },
  grid2:        { flexDirection: 'row', flexWrap: 'wrap', padding: 12, paddingBottom: 0, gap: 8 },
  metricCard:   { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  metricLabel:  { fontSize: 10, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  metricValue:  { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  metricNote:   { fontSize: 12, color: '#64748B', marginTop: 2 },
  metricDelta:  { fontSize: 12, fontWeight: '500', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
  budgetRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  budgetLabel:  { fontSize: 13, color: '#0F172A' },
  budgetVals:   { fontSize: 12, color: '#64748B' },
  barBg:        { height: 7, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 4 },
});
