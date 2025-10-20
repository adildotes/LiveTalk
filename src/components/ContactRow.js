import React from 'react';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, StyleSheet, TouchableOpacity, Image } from 'react-native';

import { colors } from '../config/constants';

const makeInitials = (name) => {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const ContactRow = ({
  name,
  subtitle = '',
  onPress,
  style,
  onLongPress,
  selected,
  showForwardIcon = true,
  subtitle2 = '',
  newMessageCount = 0,
  avatar,
}) => {
  const initials = makeInitials(name);

  return (
    <TouchableOpacity style={[styles.row, style]} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatarImage} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{initials}</Text>
        </View>
      )}

      <View style={styles.textsContainer}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {name}
        </Text>
        {subtitle !== '' && (
          <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightContainer}>
        {subtitle2 !== '' && <Text style={styles.subtitle2}>{subtitle2}</Text>}

        {newMessageCount > 0 && (
          <View style={styles.newMessageBadge}>
            <Text style={styles.newMessageText}>{newMessageCount}</Text>
          </View>
        )}

        {selected && (
          <View style={styles.overlay}>
            <Ionicons name="checkmark-outline" size={14} color="white" />
          </View>
        )}

        {showForwardIcon && <Ionicons name="chevron-forward-outline" size={20} color="#666" />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  newMessageBadge: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 12,
    justifyContent: 'center',
    marginBottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newMessageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderColor: 'black',
    borderRadius: 11,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 22,
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 40,
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  subtitle: {
    color: '#565656',
    fontSize: 14,
    marginTop: 4,
  },
  subtitle2: {
    color: '#8e8e8e',
    fontSize: 12,
    marginBottom: 4,
  },
  textsContainer: {
    flex: 1,
    marginStart: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
  },
});

ContactRow.propTypes = {
  name: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  onPress: PropTypes.func.isRequired,
  style: PropTypes.object,
  onLongPress: PropTypes.func,
  selected: PropTypes.bool,
  showForwardIcon: PropTypes.bool,
  subtitle2: PropTypes.string,
  newMessageCount: PropTypes.number,
  avatar: PropTypes.string,
};

export default ContactRow;
