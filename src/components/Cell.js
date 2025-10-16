import React from 'react';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';

const Cell = ({
  title,
  icon,
  iconColor = 'white',
  tintColor = '#ccc',
  style,
  onPress,
  secondIcon,
  subtitle,
  showForwardIcon = true,
}) => (
  <TouchableOpacity style={[styles.cell, style]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconContainer, { backgroundColor: tintColor }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>

    <View style={styles.textsContainer}>
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">
          {subtitle}
        </Text>
      )}
    </View>

    {showForwardIcon && (
      <View style={styles.iconRight}>
        <Ionicons name={secondIcon ?? 'chevron-forward-outline'} size={20} color="#6b6b6b" />
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    backgroundColor: 'white',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  subtitle: {
    color: '#565656',
    marginTop: 4,
    fontSize: 13,
  },
  textsContainer: {
    flex: 1,
    marginStart: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  iconRight: {
    marginLeft: 8,
  },
});

Cell.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  iconColor: PropTypes.string,
  tintColor: PropTypes.string,
  style: PropTypes.object,
  onPress: PropTypes.func,
  secondIcon: PropTypes.string,
  subtitle: PropTypes.string,
  showForwardIcon: PropTypes.bool,
};

export default Cell;
