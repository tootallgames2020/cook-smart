import { API_BASE_URL } from '../config/api';
import { getAuthToken } from './authService';

export interface VoiceCommand {
  command_text: string;
  intent?: string;
  entities?: Record<string, unknown>;
  confidence?: number;
}

export interface VoiceResponse {
  success: boolean;
  response_text: string;
  action_taken?: string;
  data?: Record<string, unknown>;
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
  parameters: Record<string, unknown>;
  success: boolean;
  result_data?: Record<string, unknown>;
}

export interface ContextualInsight {
  insight_type: 'cooking_tip' | 'nutrition_alert' | 'safety_warning' | 'efficiency_suggestion' | 'family_coordination';
  message: string;
  relevance_score: number;
  timing: 'immediate' | 'next_step' | 'end_of_cooking' | 'later';
}

/**
 * Service for voice command processing and Apex Voice Intelligence
 * Handles both basic and advanced voice interactions with the kitchen assistant
 */
class VoiceService {
  private baseUrl = `${API_BASE_URL}/api/v1`;

  /**
   * Process a basic voice command using standard voice recognition
   * Suitable for simple commands like adding ingredients or setting timers
   * 
   * @param command - The voice command to process
   * @param command.command_text - The text of the voice command
   * @param command.intent - Optional detected intent
   * @param command.entities - Optional extracted entities
   * @param command.confidence - Optional confidence score
   * @returns Promise<VoiceResponse> - Response with action taken and result
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const response = await voiceService.processVoiceCommand({
   *   command_text: 'Add 2 cups of milk to shopping list'
   * });
   * console.log(response.response_text);
   * ```
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
      throw error;
    }
  }

  /**
   * Process an advanced voice command using Apex Voice Intelligence
   * Provides contextual understanding, multi-turn conversations, and smart actions
   * Ideal for complex cooking scenarios with hands-free operation
   * 
   * @param request - The Apex voice request with context
   * @param request.audio_data - Base64 encoded audio data (optional)
   * @param request.text_input - Text input instead of audio (optional)
   * @param request.voice_context - Cooking context information
   * @param request.intelligence_level - Level of AI processing ('basic' | 'contextual' | 'genius')
   * @returns Promise<ApexVoiceResponse> - Advanced response with actions and insights
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const response = await voiceService.processApexVoiceCommand({
   *   text_input: 'What should I do with the leftover chicken?',
   *   voice_context: {
   *     cooking_mode: 'planning',
   *     hands_busy: false,
   *     kitchen_noise_level: 'quiet'
   *   },
   *   intelligence_level: 'genius'
   * });
   * console.log(response.response_text);
   * response.actions_taken.forEach(action => console.log(action.description));
   * ```
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
      throw error;
    }
  }

  /**
   * Retrieve the user's voice command history
   * Useful for reviewing past commands and improving voice recognition
   * 
   * @param limit - Maximum number of commands to retrieve (default: 50)
   * @returns Promise<VoiceCommand[]> - Array of past voice commands
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const history = await voiceService.getVoiceHistory(20);
   * history.forEach(cmd => {
   *   console.log(`${cmd.command_text} (confidence: ${cmd.confidence})`);
   * });
   * ```
   */
  async getVoiceHistory(limit: number = 50): Promise<VoiceCommand[]> {
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
      throw error;
    }
  }

  /**
   * Update the user's voice command preferences and settings
   * Configure voice recognition, processing methods, and language preferences
   * 
   * @param settings - Voice settings to update
   * @param settings.voice_commands_enabled - Enable/disable voice commands
   * @param settings.apex_voice_enabled - Enable/disable Apex Voice Intelligence
   * @param settings.processing_method - Processing method ('local_only' | 'cloud_enhanced')
   * @param settings.language_preference - Preferred language code
   * @param settings.accent_adaptation - Enable accent adaptation
   * @returns Promise<void>
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * await voiceService.updateVoiceSettings({
   *   apex_voice_enabled: true,
   *   processing_method: 'cloud_enhanced',
   *   language_preference: 'en-US',
   *   accent_adaptation: true
   * });
   * ```
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
      throw error;
    }
  }

  /**
   * Start a multi-turn conversation with Apex Voice Intelligence
   * Enables contextual follow-up questions and continuous interaction
   * 
   * @param context - Initial conversation context
   * @param context.cooking_mode - Current cooking mode
   * @param context.current_recipe_id - Recipe being cooked
   * @param context.family_members_present - Family members in kitchen
   * @returns Promise<{conversation_id: string}> - Conversation session ID
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const session = await voiceService.startVoiceConversation({
   *   cooking_mode: 'cooking',
   *   current_recipe_id: '12345',
   *   family_members_present: ['Mom', 'Dad', 'Kids']
   * });
   * console.log('Conversation started:', session.conversation_id);
   * ```
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
      throw error;
    }
  }

  /**
   * Get analytics and insights about voice command usage
   * Provides statistics on command success rates and patterns
   * 
   * @returns Promise<object> - Voice usage analytics
   * @returns Promise<object>.total_commands - Total commands processed
   * @returns Promise<object>.success_rate - Percentage of successful commands
   * @returns Promise<object>.most_used_commands - Most frequently used commands
   * @returns Promise<object>.average_confidence - Average confidence score
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * const insights = await voiceService.getVoiceInsights();
   * console.log(`Success rate: ${insights.success_rate}%`);
   * console.log('Top commands:', insights.most_used_commands);
   * ```
   */
  async getVoiceInsights(): Promise<{
    total_commands: number;
    success_rate: number;
    most_used_commands: string[];
    average_confidence: number;
  }> {
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
      throw error;
    }
  }

  /**
   * Process text input as if it were a voice command
   * Useful for testing voice commands or accessibility features
   * 
   * @param text - The text to process as a voice command
   * @param useApex - Whether to use Apex Voice Intelligence (default: false)
   * @returns Promise<VoiceResponse | ApexVoiceResponse> - Command response
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * // Basic processing
   * const response = await voiceService.processTextAsVoice(
   *   'Add eggs to shopping list'
   * );
   * 
   * // Apex processing
   * const apexResponse = await voiceService.processTextAsVoice(
   *   'What can I make with chicken and rice?',
   *   true
   * );
   * ```
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
   * Get a list of pre-defined quick voice commands
   * Provides common commands for quick access in the UI
   * 
   * @returns Array<{label: string; command: string}> - Quick command options
   * 
   * @example
   * ```typescript
   * const quickCommands = voiceService.getQuickCommands();
   * quickCommands.forEach(cmd => {
   *   console.log(`${cmd.label}: "${cmd.command}"`);
   * });
   * ```
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