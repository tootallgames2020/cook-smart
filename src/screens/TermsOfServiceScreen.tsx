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

interface TermsOfServiceScreenProps {
  navigation: any;
}

export const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: November 19, 2025</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using Cook Smart, you agree to be bound by these Terms
          of Service. If you do not agree to these terms, please do not use our
          service.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          Cook Smart is a mobile application that helps users:
        </Text>
        <Text style={styles.bulletPoint}>
          • Manage their pantry ingredients
        </Text>
        <Text style={styles.bulletPoint}>
          • Discover recipes based on available ingredients
        </Text>
        <Text style={styles.bulletPoint}>
          • Create and manage shopping lists
        </Text>
        <Text style={styles.bulletPoint}>
          • Track dietary preferences and restrictions
        </Text>
        <Text style={styles.bulletPoint}>• Save and rate recipes</Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          To use Cook Smart, you must create an account. You are responsible
          for:
        </Text>
        <Text style={styles.bulletPoint}>
          • Maintaining the confidentiality of your account
        </Text>
        <Text style={styles.bulletPoint}>
          • All activities that occur under your account
        </Text>
        <Text style={styles.bulletPoint}>
          • Notifying us of any unauthorized use
        </Text>
        <Text style={styles.bulletPoint}>
          • Providing accurate and current information
        </Text>

        <Text style={styles.sectionTitle}>4. Subscription and Payments</Text>
        <Text style={styles.paragraph}>
          Cook Smart offers both free and premium subscription plans:
        </Text>
        <Text style={styles.bulletPoint}>• Free plan with basic features</Text>
        <Text style={styles.bulletPoint}>
          • Premium plans with additional features
        </Text>
        <Text style={styles.bulletPoint}>
          • Subscriptions auto-renew unless cancelled
        </Text>
        <Text style={styles.bulletPoint}>
          • Refunds are handled according to our refund policy
        </Text>
        <Text style={styles.bulletPoint}>
          • You can cancel anytime from account settings
        </Text>

        <Text style={styles.sectionTitle}>5. User Content</Text>
        <Text style={styles.paragraph}>
          You retain ownership of content you submit to Cook Smart. By
          submitting content, you grant us a license to use, display, and
          distribute your content within the app.
        </Text>
        <Text style={styles.paragraph}>
          You agree not to submit content that:
        </Text>
        <Text style={styles.bulletPoint}>
          • Violates any laws or regulations
        </Text>
        <Text style={styles.bulletPoint}>
          • Infringes on intellectual property rights
        </Text>
        <Text style={styles.bulletPoint}>
          • Contains harmful or offensive material
        </Text>
        <Text style={styles.bulletPoint}>
          • Impersonates others or is misleading
        </Text>

        <Text style={styles.sectionTitle}>6. Prohibited Uses</Text>
        <Text style={styles.paragraph}>You may not use Cook Smart to:</Text>
        <Text style={styles.bulletPoint}>• Violate any applicable laws</Text>
        <Text style={styles.bulletPoint}>
          • Transmit malicious code or viruses
        </Text>
        <Text style={styles.bulletPoint}>
          • Attempt to gain unauthorized access
        </Text>
        <Text style={styles.bulletPoint}>
          • Interfere with the service's operation
        </Text>
        <Text style={styles.bulletPoint}>
          • Scrape or copy content without permission
        </Text>

        <Text style={styles.sectionTitle}>7. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          Cook Smart integrates with third-party services for recipes, barcode
          scanning, and payments. We are not responsible for the content or
          practices of these third-party services.
        </Text>

        <Text style={styles.sectionTitle}>8. Disclaimer of Warranties</Text>
        <Text style={styles.paragraph}>
          Cook Smart is provided "as is" without warranties of any kind. We do
          not guarantee that the service will be uninterrupted, secure, or
          error-free. Recipe information is provided for informational purposes
          only.
        </Text>

        <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the maximum extent permitted by law, Cook Smart shall not be liable
          for any indirect, incidental, special, or consequential damages
          arising from your use of the service.
        </Text>

        <Text style={styles.sectionTitle}>10. Termination</Text>
        <Text style={styles.paragraph}>
          We reserve the right to suspend or terminate your account if you
          violate these Terms of Service. You may delete your account at any
          time from the app settings.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may update these Terms of Service from time to time. We will notify
          you of any material changes by posting the new terms and updating the
          "Last Updated" date.
        </Text>

        <Text style={styles.sectionTitle}>12. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed by the laws of the United States,
          without regard to conflict of law provisions.
        </Text>

        <Text style={styles.sectionTitle}>13. Contact Information</Text>
        <Text style={styles.paragraph}>
          If you have questions about these Terms of Service, please contact us
          at:
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
