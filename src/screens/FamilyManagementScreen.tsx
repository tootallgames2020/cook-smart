import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { familyService } from '../services/familyService';

interface FamilyMember {
  id: string;
  user_id: string;
  family_id: string;
  role: 'admin' | 'member' | 'child';
  name: string;
  email: string;
  joined_at: string;
  last_active?: string;
  location_sharing_enabled: boolean;
}

interface Family {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  member_count: number;
  settings: {
    auto_share_shopping_lists: boolean;
    location_notifications: boolean;
    meal_planning_shared: boolean;
  };
}

export const FamilyManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    loadFamilyData();
  }, []);

  const loadFamilyData = async () => {
    try {
      setLoading(true);
      const familyData = await familyService.getUserFamily();
      
      if (familyData) {
        setFamily(familyData.family);
        setMembers(familyData.members || []);
      }
    } catch (error) {
      console.error('Error loading family data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'Please enter a family name');
      return;
    }

    try {
      const newFamily = await familyService.createFamily(familyName.trim());
      setFamily(newFamily);
      setCreateModalVisible(false);
      setFamilyName('');
      await loadFamilyData();
      
      Alert.alert(
        'Family Created!',
        `Your family "${newFamily.name}" has been created. Share the invite code: ${newFamily.invite_code}`
      );
    } catch (error) {
      console.error('Error creating family:', error);
      Alert.alert('Error', 'Could not create family. Please try again.');
    }
  };

  const joinFamily = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    try {
      await familyService.joinFamily(inviteCode.trim());
      setJoinModalVisible(false);
      setInviteCode('');
      await loadFamilyData();
      
      Alert.alert('Success!', 'You have joined the family.');
    } catch (error) {
      console.error('Error joining family:', error);
      Alert.alert('Error', 'Could not join family. Please check the invite code.');
    }
  };

  const leaveFamily = () => {
    Alert.alert(
      'Leave Family',
      'Are you sure you want to leave this family? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await familyService.leaveFamily();
              setFamily(null);
              setMembers([]);
              Alert.alert('Left Family', 'You have left the family.');
            } catch (error) {
              Alert.alert('Error', 'Could not leave family. Please try again.');
            }
          },
        },
      ]
    );
  };

  const removeMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Remove ${memberName} from the family?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await familyService.removeFamilyMember(memberId);
              await loadFamilyData();
              Alert.alert('Success', `${memberName} has been removed from the family.`);
            } catch (error) {
              Alert.alert('Error', 'Could not remove member. Please try again.');
            }
          },
        },
      ]
    );
  };

  const updateMemberRole = (memberId: string, newRole: 'admin' | 'member' | 'child') => {
    Alert.alert(
      'Update Role',
      `Change member role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              await familyService.updateMemberRole(memberId, newRole);
              await loadFamilyData();
              Alert.alert('Success', 'Member role updated.');
            } catch (error) {
              Alert.alert('Error', 'Could not update role. Please try again.');
            }
          },
        },
      ]
    );
  };

  const shareInviteCode = () => {
    if (family) {
      setInviteModalVisible(true);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#FF6B6B';
      case 'member': return '#4ECDC4';
      case 'child': return '#45B7D1';
      default: return '#666';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return 'shield';
      case 'member': return 'person';
      case 'child': return 'child-care';
      default: return 'person';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading family data...</Text>
      </View>
    );
  }

  if (!family) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.noFamilyContainer}>
          <Icon name="people-outline" size={80} color="#E0E0E0" />
          <Text style={styles.noFamilyTitle}>No Family Yet</Text>
          <Text style={styles.noFamilySubtitle}>
            Create a family or join an existing one to start coordinating meals and shopping together.
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.createButton]}
              onPress={() => setCreateModalVisible(true)}
            >
              <Icon name="add" size={24} color="white" />
              <Text style={styles.actionButtonText}>Create Family</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.joinButton]}
              onPress={() => setJoinModalVisible(true)}
            >
              <Icon name="person-add" size={24} color="white" />
              <Text style={styles.actionButtonText}>Join Family</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Create Family Modal */}
        <Modal
          visible={createModalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Create Family</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Family name (e.g., The Smiths)"
                value={familyName}
                onChangeText={setFamilyName}
                autoCapitalize="words"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setCreateModalVisible(false);
                    setFamilyName('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={createFamily}
                >
                  <Text style={styles.confirmButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Join Family Modal */}
        <Modal
          visible={joinModalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Join Family</Text>
              <Text style={styles.modalSubtitle}>
                Enter the invite code shared by a family member
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Invite code"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setJoinModalVisible(false);
                    setInviteCode('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={joinFamily}
                >
                  <Text style={styles.confirmButtonText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Family Header */}
      <View style={styles.familyHeader}>
        <View style={styles.familyInfo}>
          <Text style={styles.familyName}>{family.name}</Text>
          <Text style={styles.memberCount}>{members.length} members</Text>
        </View>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={shareInviteCode}
        >
          <Icon name="person-add" size={20} color="#4ECDC4" />
        </TouchableOpacity>
      </View>

      {/* Family Members */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Family Members</Text>
        {members.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberInfo}>
              <View style={styles.memberHeader}>
                <Text style={styles.memberName}>{member.name}</Text>
                <View style={[styles.roleTag, { backgroundColor: getRoleColor(member.role) }]}>
                  <Icon 
                    name={getRoleIcon(member.role) as any} 
                    size={12} 
                    color="white" 
                  />
                  <Text style={styles.roleText}>{member.role}</Text>
                </View>
              </View>
              <Text style={styles.memberEmail}>{member.email}</Text>
              {member.last_active && (
                <Text style={styles.lastActive}>
                  Last active: {new Date(member.last_active).toLocaleDateString()}
                </Text>
              )}
            </View>
            
            {/* Member Actions (only for admins) */}
            {user?.id !== member.user_id && (
              <View style={styles.memberActions}>
                <TouchableOpacity
                  style={styles.actionIcon}
                  onPress={() => {
                    Alert.alert(
                      'Change Role',
                      'Select new role:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Admin', onPress: () => updateMemberRole(member.id, 'admin') },
                        { text: 'Member', onPress: () => updateMemberRole(member.id, 'member') },
                        { text: 'Child', onPress: () => updateMemberRole(member.id, 'child') },
                      ]
                    );
                  }}
                >
                  <Icon name="settings" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIcon}
                  onPress={() => removeMember(member.id, member.name)}
                >
                  <Icon name="remove-circle" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Family Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Family Actions</Text>
        
        <TouchableOpacity style={styles.actionCard} onPress={shareInviteCode}>
          <Icon name="share" size={24} color="#4ECDC4" />
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Invite Members</Text>
            <Text style={styles.actionSubtitle}>Share invite code with family</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={leaveFamily}>
          <Icon name="exit" size={24} color="#FF6B6B" />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: '#FF6B6B' }]}>Leave Family</Text>
            <Text style={styles.actionSubtitle}>Remove yourself from this family</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Invite Code Modal */}
      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Invite Family Members</Text>
            <Text style={styles.modalSubtitle}>
              Share this code with family members to join
            </Text>
            <View style={styles.inviteCodeContainer}>
              <Text style={styles.inviteCodeText}>{family?.invite_code}</Text>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => setInviteModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noFamilyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noFamilyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  noFamilySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  actionButtons: {
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  createButton: {
    backgroundColor: '#4ECDC4',
  },
  joinButton: {
    backgroundColor: '#45B7D1',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 10,
  },
  familyHeader: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  familyInfo: {
    flex: 1,
  },
  familyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  inviteButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#E8F8F5',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginRight: 10,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  lastActive: {
    fontSize: 12,
    color: '#999',
  },
  memberActions: {
    flexDirection: 'row',
  },
  actionIcon: {
    padding: 8,
    marginLeft: 5,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
  },
  actionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  confirmButton: {
    backgroundColor: '#4ECDC4',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  inviteCodeContainer: {
    backgroundColor: '#F0F9FF',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  inviteCodeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#45B7D1',
    letterSpacing: 2,
  },
});

export default FamilyManagementScreen;