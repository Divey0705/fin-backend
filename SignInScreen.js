import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { login } from '../api/client';
import { useUser } from '../context/UserContext';

const BRAND = '#4F46E5';

export default function SignInScreen({ navigation }) {
  const { saveUser } = useUser();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Required', 'Please fill in both fields'); return; }
    setLoading(true);
    try {
      const data = await login(email, password);
      await saveUser(data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.logo}>Fin</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to your account</Text>

        <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign in →</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Onboarding')}>
          <Text style={styles.link}>New here? <Text style={{ color: BRAND }}>Create account</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 28, justifyContent: 'center' },
  logo:      { fontSize: 28, fontWeight: '800', color: BRAND, marginBottom: 24 },
  title:     { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  sub:       { fontSize: 14, color: '#64748B', marginBottom: 28 },
  input:     { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 14 },
  btn:       { backgroundColor: BRAND, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4, marginBottom: 16 },
  btnText:   { color: '#fff', fontSize: 15, fontWeight: '600' },
  link:      { textAlign: 'center', fontSize: 13, color: '#94A3B8' },
});
