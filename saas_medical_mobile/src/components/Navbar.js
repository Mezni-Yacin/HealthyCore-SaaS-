// src/components/Navbar.js
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function Navbar({ navigation, title = 'Accueil' }) {
  const { user } = useAuth();

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  return (
    <View style={styles.container}>
      {/* Logo et titre */}
      <View style={styles.left}>
        <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Infos utilisateur + bouton profil */}
      <View style={styles.right}>
        {user && (
          <>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user.first_name || user.username}
              </Text>
              <Text style={styles.userRole} numberOfLines={1}>
                {user.role === 'super_admin' ? 'Super Admin' :
                 user.role === 'lab_staff' ? 'Labo' :
                 user.role === 'pharmacist' ? 'Pharmacien' :
                 user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Text>
            </View>

            {/* Avatar */}
            {user.profile_picture_url ? (
              <TouchableOpacity onPress={handleProfile}>
                <Image source={{ uri: user.profile_picture_url }} style={styles.avatar} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleProfile} style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 16 },
  right: { flexDirection: 'row', alignItems: 'center' },
  userInfo: { marginRight: 12 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  userRole: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginLeft: 8 
  },
  avatarPlaceholder: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 8 
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});