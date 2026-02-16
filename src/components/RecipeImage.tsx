import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  ImageStyle,
} from 'react-native';

interface RecipeImageProps {
  imageUrl?: string;
  style?: ImageStyle;
  placeholderStyle?: ViewStyle;
  showSubtext?: boolean;
}

export const RecipeImage: React.FC<RecipeImageProps> = ({
  imageUrl,
  style,
  placeholderStyle,
  showSubtext = true,
}) => {
  const [imageError, setImageError] = useState(false);
  const [_imageLoading, setImageLoading] = useState(true);

  // Show placeholder if no URL, image failed to load, or still loading and failed
  const shouldShowPlaceholder = !imageUrl || imageError;

  if (shouldShowPlaceholder) {
    return (
      <View style={[style, placeholderStyle, styles.placeholderContainer]}>
        <Text style={styles.placeholderEmoji}>🍽️</Text>
        {showSubtext && (
          <Text style={styles.placeholderText}>
            {!imageUrl ? 'No Image Available' : 'Image Failed to Load'}
          </Text>
        )}
      </View>
    );
  }

  return (
    <Image
      source={{uri: imageUrl}}
      style={style}
      onLoad={() => {
        setImageLoading(false);
        setImageError(false);
      }}
      onError={error => {
        setImageLoading(false);
        setImageError(true);
      }}
      onLoadStart={() => {
        setImageLoading(true);
        setImageError(false);
      }}
    />
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});
