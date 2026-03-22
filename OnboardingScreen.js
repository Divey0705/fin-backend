import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { register } from '../api/client';
import { useUser } from '../context/UserContext';

const BRAND = '#4F46E5';
const steps = ['Basic Info', 'Income & Expenses', 'Financial Awareness', 'Create Account'];

function ToggleGroup({ value, onChange, options = ['Yes', 'No'] }) {
  return (
    <View style={styles.toggleGroup}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[styles.toggleBtn, value?.toLowerCase() === opt.toLowerCase() && styles.toggleBtnActive]}
          onPress={() => onChange(opt.toLowerCase())}
        >
          <Text style={[styles.toggleText, value?.toLowerCase() === opt.toLowerCase() && styles.toggleTextActive]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function OnboardingScreen({ navigation }) {
  const { saveUser } = useUser();
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', age: '', gender: 'male', occupation: 'student',
    living_type: 'alone', part_time_job: 'no',
    monthly_income: '', avg_monthly_spending: '',
    main_expense_category: 'food', save_regularly: 'no',
    monthly_savings: '0', know_budgeting: 'yes',
    know_investments: 'no', track_expenses: 'no',
    borrow_often: 'no', email: '', password: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const next = () => {
    if (step === 1 && !form.name.trim()) { Alert.alert('Required', 'Please enter your name'); return; }
    if (step < 4) setStep(s => s + 1);
    else submit();
  };

  const submit = async () => {
    if (!form.email.trim()) { Alert.alert('Required', 'Please enter your email'); return; }
    if (form.password.length < 8) { Alert.alert('Required', 'Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        age: parseInt(form.age) || 20,
        monthly_income: parseFloat(form.monthly_income) || 0,
        avg_monthly_spending: parseFloat(form.avg_monthly_spending) || 0,
        monthly_savings: parseFloat(form.monthly_savings) || 0,
      };
      const data = await register(payload);
      await saveUser(data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 4) * 100;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Fin</Text>
          <Text style={styles.stepLabel}>Step {step} of 4 — {steps[step - 1]}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Step 1 — Basic Info */}
        {step === 1 && (
          <View>
            <Field label="Full name">
              <TextInput style={styles.input} placeholder="e.g. Arjun Kumar" value={form.name} onChangeText={v => set('name', v)} />
            </Field>
            <Field label="Age">
              <TextInput style={styles.input} placeholder="e.g. 21" keyboardType="number-pad" value={form.age} onChangeText={v => set('age', v)} />
            </Field>
            <Field label="Gender">
              <PickerField value={form.gender} onChange={v => set('gender', v)} items={[['male','Male'],['female','Female'],['other','Other']]} />
            </Field>
            <Field label="Occupation">
              <PickerField value={form.occupation} onChange={v => set('occupation', v)} items={[['student','Student'],['employed','Employed'],['self_employed','Self-employed'],['freelancer','Freelancer'],['other','Other']]} />
            </Field>
            <Field label="Living type">
              <PickerField value={form.living_type} onChange={v => set('living_type', v)} items={[['alone','Living alone'],['family','With family'],['shared','Shared accommodation'],['pg','PG / Hostel']]} />
            </Field>
          </View>
        )}

        {/* Step 2 — Income & Expenses */}
        {step === 2 && (
          <View>
            <Field label="Monthly income (₹)">
              <TextInput style={styles.input} placeholder="e.g. 5000" keyboardType="number-pad" value={form.monthly_income} onChangeText={v => set('monthly_income', v)} />
            </Field>
            <Field label="Avg monthly spending (₹)">
              <TextInput style={styles.input} placeholder="e.g. 4200" keyboardType="number-pad" value={form.avg_monthly_spending} onChangeText={v => set('avg_monthly_spending', v)} />
            </Field>
            <Field label="Main expense category">
              <PickerField value={form.main_expense_category} onChange={v => set('main_expense_category', v)} items={[['food','Food'],['transport','Transport'],['rent','Rent'],['entertainment','Entertainment'],['shopping','Shopping'],['others','Others']]} />
            </Field>
            <Field label="Monthly savings (₹)">
              <TextInput style={styles.input} placeholder="0 if none" keyboardType="number-pad" value={form.monthly_savings} onChangeText={v => set('monthly_savings', v)} />
            </Field>
            <Field label="Part-time job?">
              <ToggleGroup value={form.part_time_job} onChange={v => set('part_time_job', v)} />
            </Field>
            <Field label="Save regularly?">
              <ToggleGroup value={form.save_regularly} onChange={v => set('save_regularly', v)} />
            </Field>
          </View>
        )}

        {/* Step 3 — Financial Awareness */}
        {step === 3 && (
          <View>
            {[
              ['know_budgeting',   'Know budgeting?',   '50/30/20 rule, envelope method etc.'],
              ['know_investments', 'Know investments?', 'SIP, mutual funds, stocks etc.'],
              ['track_expenses',  'Track expenses?',   'Log spending regularly'],
              ['borrow_often',    'Borrow often?',     'From friends, apps or family'],
            ].map(([key, label, sub]) => (
              <View key={key} style={styles.awarenessRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.awarenessLabel}>{label}</Text>
                  <Text style={styles.awarenessSub}>{sub}</Text>
                </View>
                <ToggleGroup value={form[key]} onChange={v => set(key, v)} />
              </View>
            ))}
          </View>
        )}

        {/* Step 4 — Account */}
        {step === 4 && (
          <View>
            <Field label="Email">
              <TextInput style={styles.input} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={v => set('email', v)} />
            </Field>
            <Field label="Password">
              <TextInput style={styles.input} placeholder="Min 8 characters" secureTextEntry value={form.password} onChangeText={v => set('password', v)} />
            </Field>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.btnRow}>
          {step > 1 && (
            <TouchableOpacity style={styles.btnOutline} onPress={() => setStep(s => s - 1)}>
              <Text style={styles.btnOutlineText}>← Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btnBrand, { flex: 1 }]} onPress={next} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnBrandText}>{step === 4 ? 'View my dashboard →' : 'Continue →'}</Text>}
          </TouchableOpacity>
        </View>

        {step === 1 && (
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.linkText}>Already have an account? <Text style={{ color: BRAND }}>Sign in</Text></Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function PickerField({ value, onChange, items }) {
  return (
    <View style={styles.pickerWrap}>
      <Picker selectedValue={value} onValueChange={onChange} style={{ height: 44 }}>
        {items.map(([v, l]) => <Picker.Item key={v} label={l} value={v} />)}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#fff' },
  content:     { padding: 24, paddingBottom: 48 },
  header:      { marginBottom: 28 },
  logo:        { fontFamily: 'System', fontSize: 28, fontWeight: '800', color: BRAND, marginBottom: 4 },
  stepLabel:   { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 10 },
  progressTrack: { height: 3, backgroundColor: '#E2E8F0', borderRadius: 2 },
  progressFill:  { height: 3, backgroundColor: BRAND, borderRadius: 2 },
  label:       { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input:       { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 14, color: '#0F172A', backgroundColor: '#fff' },
  pickerWrap:  { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' },
  toggleGroup: { flexDirection: 'row', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' },
  toggleBtn:   { flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#fff' },
  toggleBtnActive: { backgroundColor: BRAND },
  toggleText:  { fontSize: 13, color: '#64748B' },
  toggleTextActive: { color: '#fff', fontWeight: '500' },
  awarenessRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 12 },
  awarenessLabel: { fontSize: 13, color: '#0F172A', fontWeight: '500' },
  awarenessSub:   { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  btnRow:      { flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 16 },
  btnBrand:    { backgroundColor: BRAND, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnBrandText:{ color: '#fff', fontSize: 15, fontWeight: '600' },
  btnOutline:  { borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 10 },
  btnOutlineText: { color: '#334155', fontSize: 14 },
  linkText:    { textAlign: 'center', fontSize: 13, color: '#94A3B8', marginTop: 4 },
});
