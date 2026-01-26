import { API_BASE_URL } from '../config/api';
import { getAuthToken } from './authService';

export interface VoiceCommand {
  command_text: string;
  intent?: string;
  entities?: { [key: string]: any };
  confidence?: number;
}

export interface VoiceResponse {
  success: boolean;
  response_text: string;
  action_taken?: string;
  data?: any;
  confidence: number;
  processing_time_ms: number;
}

export interface ApexVoiceRequest {
  audio_data?: string;
  text_input?: string;
  voice_context: {
    cooking_mode?: 'prep' | 'cooking' | 'cleanup' | 'planning';
    current_recipe_id?: string;
    current_step?: number;
    hands_busy?: boolean;
    kitchen_noise_level?: 'quiet' | 'moderate' | 'noisy';
    family_members_present?: string[];
    language_preference?: string;
    accent_adaptation?: boolean;
  };
  intelligence_level: 'basic' | 'contextual' | 'genius';
}

export interface ApexVoiceResponse {
  success: boolean;
  response_audio?: string;
  response_text: string;
  response_type: 'confirmation' | 'question' | 'instruction' | 'information' | 'error';
  actions_taken: VoiceAction[];
  contextual_insights: ContextualInsight[];
  follow_up_suggestions: string[];
  confidence: number;
  processing_time_ms: number;
  language_detected?: string;
  accent_confidence?: number;
}

export interface VoiceAction {
  action_type: 'ingredient_update' | 'recipe_navigation' | 'shopping_list' | 'timer_set' | 'nutrition_log' | 'family_notification';
  description: string;
  parameters: { [key: string]: any };
  success: boolean;
  result_data?: any;
}

export interface ContextualInsight {
  insight_type: 'cooking_tip' | 'nutrition_alert' | 'safety_warning' | 'efficiency_suggestion' | 'family_coordination';
  message: string;
  relevance_score: number;
  timing: 'immediate' | 'next_step' | 'end_of_cooking' | 'later';
}

class VoiceService {
  private baseUrl = `${API_BASE_URL}/api/v1`;

  /**
   * PROCESS BASIC VOICE COMMAND
   * Send voice command to standard voice processing
   */
  async processVoiceCommand(command: VoiceCommand): Promise<VoiceResponse> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/voice-commands/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        throw new Error(`Voice command failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Voice command error:', error);
      throw error;
    }
  }

  /**
   * PROCESS APEX VOICE COMMAND
   * Send voice command to advanced Apex Voice Intelligence
   */
  async processApexVoiceCommand(request: ApexVoiceRequest): Promise<ApexVoiceResponse> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/apex-intelligence/voice/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Apex voice command failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Apex voice command error:', error);
      throw error;
    }
  }

  /**
   * GET VOICE COMMAND HISTORY
   * Retrieve user's voice command history
   */
  async getVoiceHistory(limit: number = 50): Promise<any[]> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/voice-commands/history?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get voice history failed: ${response.status}`);
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Get voice history error:', error);
      throw error;
    }
  }

  /**
   * UPDATE VOICE SETTINGS
   * Update user's voice command preferences
   */
  async updateVoiceSettings(settings: {
    voice_commands_enabled?: boolean;
    apex_voice_enabled?: boolean;
    processing_method?: 'local_only' | 'cloud_enhanced';
    language_preference?: string;
    accent_adaptation?: boolean;
  }): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/voice-commands/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`Update voice settings failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Update voice settings error:', error);
      throw error;
    }
  }

  /**
   * START VOICE CONVERSATION
   * Start a multi-turn conversation with Apex Voice Intelligence
   */
  async startVoiceConversation(context: {
    cooking_mode?: string;
    current_recipe_id?: string;
    family_members_present?: string[];
  }): Promise<{ conversation_id: string }> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/apex-intelligence/voice/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'start', context }),
      });

      if (!response.ok) {
        throw new Error(`Start voice conversation failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Start voice conversation error:', error);
      throw error;
    }
  }

  /**
   * GET VOICE INSIGHTS
   * Get analytics and insights about voice usage
   */
  async getVoiceInsights(): Promise<any> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/apex-intelligence/voice/insights`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get voice insights failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get voice insights error:', error);
      throw error;
    }
  }

  /**
   * PROCESS TEXT AS VOICE
   * Process text input as if it were a voice command (for testing/accessibility)
   */
  async processTextAsVoice(text: string, useApex: boolean = false): Promise<VoiceResponse | ApexVoiceResponse> {
    if (useApex) {
      return this.processApexVoiceCommand({
        text_input: text,
        voice_context: {
          cooking_mode: 'prep',
          hands_busy: false,
          kitchen_noise_level: 'quiet',
        },
        intelligence_level: 'contextual',
      });
    } else {
      return this.processVoiceCommand({
        command_text: text,
      });
    }
  }

  /**
   * QUICK VOICE COMMANDS
   * Pre-defined quick commands for common actions
   */
  getQuickCommands(): { label: string; command: string }[] {
    return [
      { label: 'Add to Shopping List', command: 'Add milk to shopping list' },
      { label: 'Check Inventory', command: 'How much chicken do we have?' },
      { label: 'Find Recipe', command: 'Find a recipe with chicken and rice' },
      { label: 'Set Timer', command: 'Set a timer for 15 minutes' },
      { label: 'Next Step', command: 'What\'s the next step?' },
      { label: 'Nutrition Info', command: 'How many calories is this?' },
      { label: 'Family Notification', command: 'Tell everyone dinner is ready' },
      { label: 'Meal Planning', command: 'Plan dinner for tonight' },
    ];
  }
}

export const voiceService = new VoiceService();
export default voiceService;