import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface PrivacyPolicyScreenProps {
  navigation: any;
}

export const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({
  navigation,
}) => {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: November 19, 2025</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          Cook Smart collects information you provide directly to us, including:
        </Text>
        <Text style={styles.bulletPoint}>
          • Account information (email, name)
        </Text>
        <Text style={styles.bulletPoint}>
          • Dietary preferences and restrictions
        </Text>
        <Text style={styles.bulletPoint}>• Ingredients in your pantry</Text>
        <Text style={styles.bulletPoint}>• Recipe favorites and ratings</Text>
        <Text style={styles.bulletPoint}>• Shopping lists</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the information we collect to:
        </Text>
        <Text style={styles.bulletPoint}>
          • Provide personalized recipe recommendations
        </Text>
        <Text style={styles.bulletPoint}>
          • Track your ingredients and shopping lists
        </Text>
        <Text style={styles.bulletPoint}>
          • Improve our services and user experience
        </Text>
        <Text style={styles.bulletPoint}>
          • Send you important updates about the app
        </Text>
        <Text style={styles.bulletPoint}>• Process subscription payments</Text>

        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal information. We may share your
          information only in the following circumstances:
        </Text>
        <Text style={styles.bulletPoint}>• With your consent</Text>
        <Text style={styles.bulletPoint}>
          • With service providers who help us operate the app
        </Text>
        <Text style={styles.bulletPoint}>
          • To comply with legal obligations
        </Text>
        <Text style={styles.bulletPoint}>
          • To protect our rights and safety
        </Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate security measures to protect your personal
          information. Your data is encrypted in transit and at rest. However,
          no method of transmission over the internet is 100% secure.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.paragraph}>You have the right to:</Text>
        <Text style={styles.bulletPoint}>
          • Access your personal information
        </Text>
        <Text style={styles.bulletPoint}>• Correct inaccurate information</Text>
        <Text style={styles.bulletPoint}>• Delete your account and data</Text>
        <Text style={styles.bulletPoint}>• Export your data</Text>
        <Text style={styles.bulletPoint}>
          • Opt out of marketing communications
        </Text>

        <Text style={styles.sectionTitle}>6. Cookies and Tracking</Text>
        <Text style={styles.paragraph}>
          We use cookies and similar tracking technologies to improve your
          experience and analyze app usage. You can control cookie preferences
          through your device settings.
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Cook Smart is not intended for children under 13. We do not knowingly
          collect information from children under 13. If you believe we have
          collected information from a child under 13, please contact us.
        </Text>

        <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify
          you of any changes by posting the new Privacy Policy on this page and
          updating the "Last Updated" date.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy, please contact us at:
        </Text>
        <Text style={styles.bulletPoint}>
          • Email: services.cooksmart@gmail.com
        </Text>
        <Text style={styles.bulletPoint}>• Website: Coming Soon</Text>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginLeft: 16,
    marginBottom: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
