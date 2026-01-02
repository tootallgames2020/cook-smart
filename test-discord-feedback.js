// Using built-in fetch (Node.js 18+)

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1436216941005111427/nRFnSFRtBZXeHfIuC9Ld2xOPkapaTA-K5hY4lt2PJ8FDQq5BHWc7nuO2nBbl--LnggIB';

async function testDiscordFeedback() {
  const payload = {
    embeds: [{
      title: '💬 TEST FEEDBACK',
      description: 'This is a test feedback message to verify Discord notifications are working.',
      color: 3447003,
      fields: [
        {
          name: 'User',
          value: 'Test User (test@cooksmartapp.com)',
          inline: false
        },
        {
          name: 'Rating',
          value: '⭐⭐⭐⭐⭐',
          inline: true
        },
        {
          name: 'Time',
          value: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
          inline: true
        },
        {
          name: 'Message',
          value: 'Testing Discord feedback notifications from Cook Smart app.',
          inline: false
        }
      ],
      footer: {
        text: 'Cook Smart Feedback Test'
      },
      timestamp: new Date().toISOString()
    }]
  };

  try {
    console.log('🧪 Testing Discord feedback webhook...');
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ Discord feedback webhook test SUCCESSFUL!');
      console.log('Check your Discord channel for the test message.');
    } else {
      console.error('❌ Discord webhook test FAILED:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error testing Discord webhook:', error.message);
  }
}

testDiscordFeedback();