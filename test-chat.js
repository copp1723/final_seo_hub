#!/usr/bin/env node

/**
 * Chat Functionality Test Script
 * 
 * This script tests the chat API endpoint to verify:
 * 1. Chat responses are working
 * 2. SEO knowledge base integration
 * 3. Question matching logic
 */

const testQuestions = [
  "What does my SEO package include?",
  "How long does it take to see results?",
  "What are the KPIs for SEO?",
  "Why is my traffic down?",
  "What is the difference between Silver and Gold packages?",
  "Help me understand what you can do",
  "This is a random question that shouldn't match anything"
];

async function testChatAPI() {
  console.log('🧪 Testing Chat API Functionality\n');
  
  for (const question of testQuestions) {
    console.log(`❓ Question: "${question}"`);
    
    try {
      // Note: This would need proper authentication in a real test
      // For now, this is just to show the testing approach
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Would need proper session cookie here
        },
        body: JSON.stringify({
          message: question
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const content = data.data?.content || data.content || 'No response';
        console.log(`✅ Response: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
      } else {
        console.log(`❌ Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
    }
    
    console.log('---\n');
  }
}

// Manual testing instructions
console.log(`
🔧 MANUAL TESTING INSTRUCTIONS

1. Start your development server:
   npm run dev

2. Navigate to: http://localhost:3000/chat

3. Test these scenarios:

   📝 BASIC CHAT FUNCTIONALITY:
   - Ask: "What does my SEO package include?"
   - Expected: Detailed package breakdown with Silver/Gold/Platinum info
   
   - Ask: "How long does it take to see results?"
   - Expected: Timeline information (3-6 months, etc.)
   
   - Ask: "What are the KPIs?"
   - Expected: List of tracked metrics (rankings, traffic, etc.)

   🚀 ESCALATION FUNCTIONALITY:
   - Ask any question
   - Click "Send to SEO team" button on the response
   - Expected: Modal opens with pre-filled question and answer
   - Add additional notes
   - Click "Send to Team"
   - Expected: Success message, request created in system
   - Check /requests page to verify request appears

   🎯 EDGE CASES:
   - Ask: "Random question about something unrelated"
   - Expected: Fallback response with helpful suggestions
   - Escalation button should still appear

4. Verify in browser console:
   - No JavaScript errors
   - Network requests succeed
   - Proper response format

5. Check database:
   - Escalated requests appear in Request table
   - Proper title formatting
   - Complete description with context

✅ SUCCESS CRITERIA:
- Chat provides relevant SEO answers
- Escalation button appears on all assistant messages
- Escalation modal pre-fills correctly
- Escalation creates proper request
- User receives feedback on success/failure
- No console errors or broken functionality
`);

// Uncomment to run API tests (requires proper auth setup)
// testChatAPI();