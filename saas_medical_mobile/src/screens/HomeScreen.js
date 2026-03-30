// src/screens/HomeScreen.js
import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Oui', onPress: async () => {
          await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
          navigation.replace('Login');
        }}
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Bienvenue 👋</Text>
      <Text style={styles.name}>
        {user?.first_name} {user?.last_name}
      </Text>
      <Text style={styles.role}>Rôle : {user?.role}</Text>

      <Button title="🚪 Déconnexion" onPress={handleLogout} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20,
    backgroundColor: '#f0f9ff'
  },
  welcome: { fontSize: 28, marginBottom: 10 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  role: { fontSize: 18, color: '#666', marginBottom: 40 },
});