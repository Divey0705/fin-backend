import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  const saveUser = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem('fin_user', JSON.stringify(userData));
  };

  const loadUser = async () => {
    const stored = await AsyncStorage.getItem('fin_user');
    if (stored) setUser(JSON.parse(stored));
    return stored ? JSON.parse(stored) : null;
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('fin_user');
  };

  return (
    <UserContext.Provider value={{ user, saveUser, loadUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
