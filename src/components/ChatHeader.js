import React from 'react';
import PropTypes from 'prop-types';
import { useNavigation } from '@react-navigation/native';
import { Text, View, StyleSheet, Pressable } from 'react-native';

import { colors } from '../config/constants';

const makeInitials = (name) => {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const ChatHeader = ({ chatName, chatId }) => {
  const navigation = useNavigation();
  const initials = makeInitials(chatName);

  return (
    <Pressable
      style={styles.container}
      onPress={() => navigation.navigate('ChatInfo', { chatId, chatName })}
      android_ripple={{ color: '#eee' }}
    >
      <View style={styles.avatar} accessibilityRole="image">
        <Text style={styles.avatarLabel}>{initials}</Text>
      </View>

      <Text style={styles.chatName} numberOfLines={1} ellipsizeMode="tail">
        {chatName}
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
