import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { addExpense, getExpenses } from '../api/client';
import { useUser } from '../context/UserContext';

const BRAND = '#4F46E5';
const fmt = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

const CAT_ICONS  = { food:'🍽', transport:'🚌', entertainment:'🎮', shopping:'🛍', rent:'🏠', others:'📦' };
const CAT_COLORS = { food:'#EEF2FF', transport:'#EFF6FF', entertainment:'#FFF1F2', shopping:'#FDF4FF', rent:'#F0FDF4', others:'#FFFBEB' };

export default function ExpensesScreen() {
  const { user } = useUser();
  const [expenses, setExpenses]   = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [adding, setAdding]       = useState(false);

  const [category, setCategory] = useState('food');
  const [amount, setAmount]     = useState('');
  const [desc, setDesc]         = useState('');

  useEffect(() => {
    if (user?.user_id) load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getExpenses(user.user_id, 50);
      setExpenses(data.expenses || []);
      setTodayTotal(data.today_total || 0);
      setMonthTotal(data.month_total || 0);
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!category || !amount || !desc.trim()) {
      Alert.alert('Required', 'Please fill category, amount and description');
      return;
    }
    setAdding(true);
    try {
      const data = await addExpense({
        user_id: user.user_id, category,
        amount: parseFloat(amount), description: desc,
      });
      setTodayTotal(data.today_total);
      setAmount(''); setDesc('');
      await load();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not save expense');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Expense Tracker</Text>
        <View style={s.totals}>
          <View style={s.totalItem}>
            <Text style={s.totalLabel}>Today</Text>
            <Text style={[s.totalValue, { color: '#DC2626' }]}>{fmt(todayTotal)}</Text>
          </View>
          <View style={s.totalItem}>
            <Text style={s.totalLabel}>This month</Text>
            <Text style={[s.totalValue, { color: '#DC2626' }]}>{fmt(monthTotal)}</Text>
          </View>
        </View>
      </View>

      {/* Add form */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Add expense</Text>
        <View style={s.pickerWrap}>
          <Picker selectedValue={category} onValueChange={setCategory} style={{ height: 44 }}>
            <Picker.Item label="🍽 Food"          value="food" />
            <Picker.Item label="🚌 Transport"     value="transport" />
            <Picker.Item label="🎮 Entertainment" value="entertainment" />
            <Picker.Item label="🛍 Shopping"      value="shopping" />
            <Picker.Item label="🏠 Rent"          value="rent" />
            <Picker.Item label="📦 Others"        value="others" />
          </Picker>
        </View>
        <TextInput style={s.input} placeholder="Amount (₹)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <TextInput style={s.input} placeholder="Description (e.g. Lunch)" value={desc} onChangeText={setDesc} />
        <TouchableOpacity style={s.addBtn} onPress={handleAdd} disabled={adding}>
          {adding ? <ActivityIndicator color="#fff" /> : <Text style={s.addBtnText}>+ Add expense</Text>}
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={BRAND} />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item, i) => item.id || i.toString()}
          contentContainerStyle={{ padding: 12, paddingTop: 0 }}
          renderItem={({ item }) => (
            <View style={s.expenseItem}>
              <View style={[s.expIcon, { backgroundColor: CAT_COLORS[item.category] || '#F8FAFC' }]}>
                <Text style={{ fontSize: 20 }}>{CAT_ICONS[item.category] || '📦'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.expName}>{item.description}</Text>
                <Text style={s.expMeta}>{item.date} {item.time ? `· ${item.time}` : ''} · {item.category}</Text>
              </View>
              <Text style={s.expAmount}>−{fmt(item.amount)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={s.emptyText}>No expenses yet — add your first one above.</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F1F5F9' },
  header:     { backgroundColor: '#fff', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title:      { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  totals:     { flexDirection: 'row', gap: 24 },
  totalItem:  {},
  totalLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  totalValue: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  card:       { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle:  { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  pickerWrap: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  input:      { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10 },
  addBtn:     { backgroundColor: BRAND, borderRadius: 8, padding: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  expenseItem:{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  expIcon:    { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  expName:    { fontSize: 14, fontWeight: '500', color: '#0F172A' },
  expMeta:    { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  expAmount:  { fontSize: 15, fontWeight: '600', color: '#DC2626' },
  emptyText:  { textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 32 },
});
