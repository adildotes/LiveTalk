import React from 'react';
import PropTypes from 'prop-types';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';

const Button = ({ title, variant = 'primary', onPress, style, fullWidth = false, disabled = false }) => {
  const backgroundColor = variant === 'primary' ? '#000' : 'transparent';
  const textColor = variant === 'primary' ? '#fff' : '#000';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={[
        styles.buttonContainer,
        { backgroundColor },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Text style={[styles.buttonLabel, { color: textColor }]} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

Button.propTypes = {
  title: PropTypes.string.isRequired,
  variant: PropTypes.string,
  onPress: PropTypes.func,
  style: PropTypes.object,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default Button;
