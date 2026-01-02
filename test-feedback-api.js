// Test actual feedback API endpoint
const API_BASE_URL = 'https://api.cooksmartapp.com';

async function testFeedbackAPI() {
  const feedbackData = {
    message: 'This is a test feedback message to verify the Discord notification system is working end-to-end.',
    rating: 5,
    category: 'general'
  };

  try {
    console.log('🧪 Testing feedback API endpoint...');
    
    const response = await fetch(`${API_BASE_URL}/api/v1/feedback/public`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedbackData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Feedback API test SUCCESSFUL!');
      console.log('Response:', result);
      console.log('Check Discord for the feedback notification.');
    } else {
      console.error('❌ Feedback API test FAILED:', response.status);
      console.error('Error:', result);
    }
  } catch (error) {
    console.error('❌ Network error testing feedback API:', error.message);
  }
}

testFeedbackAPI();