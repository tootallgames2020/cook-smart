// Test Discord webhook configuration endpoint
const API_BASE_URL = 'https://api.cooksmartapp.com';

async function testDiscordConfig() {
  try {
    console.log('🧪 Testing Discord webhook configuration...');
    
    // Try to access a test endpoint that shows webhook status
    const response = await fetch(`${API_BASE_URL}/api/v1/discord/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Discord config test response:', result);
    } else {
      console.log('❌ Discord config endpoint not available:', response.status);
      
      // Let's check if there's a health endpoint
      const healthResponse = await fetch(`${API_BASE_URL}/health`);
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        console.log('Server health:', health);
      }
    }
  } catch (error) {
    console.error('❌ Error testing Discord config:', error.message);
  }
}

testDiscordConfig();