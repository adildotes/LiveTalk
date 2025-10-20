import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigation } from '@react-navigation/native';
import { Text, View, StyleSheet, Pressable, Image } from 'react-native';

import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { database, auth } from '../config/firebase';

import { colors } from '../config/constants';

const makeInitials = (name) => {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const ChatHeader = ({ chatName: initialChatName, chatId }) => {
  const navigation = useNavigation();
  const [avatar, setAvatar] = useState(null);
  const [title, setTitle] = useState(initialChatName || '');
  const initials = makeInitials(title);

  useEffect(() => {
    if (!chatId) return undefined;
    const chatRef = doc(database, 'chats', chatId);
    const unsub = onSnapshot(chatRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.groupName) {
        setTitle(data.groupName);
        setAvatar(null);
        return;
      }
      const users = data.users || [];
      const currentEmail = auth?.currentUser?.email;
      const other = users.find((u) => {
        if (!u) return false;
        if (typeof u === 'string') return u !== currentEmail;
        return (u.email && u.email !== currentEmail) || (u.id && u.id !== currentEmail);
      });

      if (other) {
        const name = typeof other === 'string' ? other : (other.name || other.email || 'Unnamed');
        setTitle(name);
        const url = typeof other === 'string' ? undefined : (other.photoURL || other.avatar || undefined);
        setAvatar(url);
      }
    });

    return () => unsub && unsub();
  }, [chatId]);

  return (
    <Pressable
      style={styles.container}
      onPress={() => navigation.navigate('ChatInfo', { chatId, chatName: title })}
      android_ripple={{ color: '#eee' }}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatarImage} />
      ) : (
        <View style={styles.avatar} accessibilityRole="image">
          <Text style={styles.avatarLabel}>{initials}</Text>
        </View>
      )}

      <Text style={styles.chatName} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 10,
    width: 40,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  chatName: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 6,
    maxWidth: '85%',
  },
});

ChatHeader.propTypes = {
  chatName: PropTypes.string.isRequired,
  chatId: PropTypes.string.isRequired,
};

export default ChatHeader;
