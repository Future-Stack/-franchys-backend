import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { WhatsAppService } from '../src/modules/whatsapp/whatsapp.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

async function runLiveWhatsAppTest() {
  console.log('🚀 Initializing WhatsApp Live Test & Diagnostic Environment...\n');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const whatsAppService = app.get(WhatsAppService);
  const configService = app.get(ConfigService);

  const baseUrl = 'http://localhost:3000/api/v1';
  const verifyToken = configService.get<string>('whatsapp.verifyToken');
  const phoneNumberId = configService.get<string>('whatsapp.phoneNumberId');
  const businessAccountId = configService.get<string>('whatsapp.businessAccountId');
  const accessToken = configService.get<string>('whatsapp.accessToken');
  const apiVersion = configService.get<string>('whatsapp.graphApiVersion') || 'v19.0';
  const graphBaseUrl = `https://graph.facebook.com/${apiVersion}`;

  console.log('📋 Configuration Loaded:');
  console.log(` - Phone Number ID:     ${phoneNumberId ? `✅ Configured (${phoneNumberId})` : '❌ Missing'}`);
  console.log(` - Business Account ID: ${businessAccountId ? `✅ Configured (${businessAccountId})` : '❌ Missing'}`);
  console.log(` - Access Token:        ${accessToken ? '✅ Configured' : '❌ Missing'}`);
  console.log(` - Verify Token:        ${verifyToken ? '✅ Configured' : '❌ Missing'}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Step 0: Meta Credentials & Permission Sync Diagnostic
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 0. Meta Credentials & Permissions Diagnostic ---');
  if (accessToken && phoneNumberId) {
    try {
      // 0a. Debug Token
      const debugRes = await axios.get(`${graphBaseUrl}/debug_token`, {
        params: { input_token: accessToken, access_token: accessToken },
      });
      const tokenData = debugRes.data?.data;
      console.log(` ✅ Access Token Status: ${tokenData?.is_valid ? 'ACTIVE & VALID' : 'INVALID/EXPIRED'}`);
      console.log(`    App ID:               ${tokenData?.app_id || 'N/A'}`);
      console.log(`    Scopes/Permissions:   ${tokenData?.scopes?.join(', ') || 'N/A'}`);
      if (tokenData?.expires_at === 0) {
        console.log(`    Token Expiry:         Never Expires (System User / Production Token)`);
      } else if (tokenData?.expires_at) {
        console.log(`    Token Expiry:         ${new Date(tokenData.expires_at * 1000).toLocaleString()}`);
      }

      // 0b. Phone Number Metadata
      try {
        const phoneRes = await axios.get(`${graphBaseUrl}/${phoneNumberId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log(` ✅ Phone Number Metadata:`);
        console.log(`    Display Phone:        ${phoneRes.data?.display_phone_number || 'N/A'}`);
        console.log(`    Verified Name:        ${phoneRes.data?.verified_name || 'N/A'}`);
        console.log(`    Quality Rating:       ${phoneRes.data?.quality_rating || 'N/A'}`);
        console.log(`    Status:               ${phoneRes.data?.code_verification_status || phoneRes.data?.status || 'CONNECTED'}`);
      } catch (phoneErr: any) {
        console.log(` ❌ Phone Number ID (${phoneNumberId}) Lookup Failed:`, phoneErr.response?.data?.error?.message || phoneErr.message);
      }

      // 0c. Business Account Metadata
      if (businessAccountId) {
        try {
          const wabaRes = await axios.get(`${graphBaseUrl}/${businessAccountId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          console.log(` ✅ Business Account (WABA) Metadata:`);
          console.log(`    WABA Name:            ${wabaRes.data?.name || 'N/A'}`);
          console.log(`    Currency:             ${wabaRes.data?.currency || 'N/A'}`);
          console.log(`    Timezone:             ${wabaRes.data?.timezone_id || 'N/A'}`);
        } catch (wabaErr: any) {
          console.log(` ❌ Business Account ID (${businessAccountId}) Lookup Failed:`, wabaErr.response?.data?.error?.message || wabaErr.message);
        }

        // 0d. Approved Templates
        try {
          const tmplRes = await axios.get(`${graphBaseUrl}/${businessAccountId}/message_templates`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { limit: 10 },
          });
          const templates = tmplRes.data?.data || [];
          console.log(` ✅ Approved Templates on this Account (${templates.length} found):`);
          templates.forEach((t: any) => {
            console.log(`    - Name: "${t.name}" | Status: ${t.status} | Language: ${t.language}`);
          });
        } catch (tmplErr: any) {
          console.log(` ⚠️ Templates Lookup Note:`, tmplErr.response?.data?.error?.message || tmplErr.message);
        }
      }
    } catch (err: any) {
      console.log(` ❌ Meta API Connection Error:`, err.response?.data?.error?.message || err.message);
    }
  } else {
    console.log(' ❌ Access Token or Phone Number ID missing in configuration.');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1: GET Webhook Verification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 1. Testing Webhook Verification (GET /whatsapp/webhook) ---');
  try {
    const res = await axios.get(`${baseUrl}/whatsapp/webhook`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': 'TEST_LIVE_CHALLENGE_123',
      },
    });
    if (res.data === 'TEST_LIVE_CHALLENGE_123') {
      console.log('✅ Webhook Verification Passed! Challenge code returned correctly.');
    } else {
      console.log('❌ Webhook Verification Failed: Unexpected response:', res.data);
    }
  } catch (err: any) {
    console.log('❌ Webhook Verification Failed:', err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: Simulate Incoming Webhook Message
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Incoming Webhook Message Processing ---');
  const testPhoneArg = process.argv.find((arg) => arg.startsWith('--phone='));
  const rawPhone = testPhoneArg ? testPhoneArg.split('=')[1] : '8801625243117';
  const testPhone = rawPhone.replace(/\+/g, '').trim();
  const testMsgId = `wamid.live_test_${Date.now()}`;
  console.log(`Simulating incoming message from phone: ${testPhone}`);

  try {
    const webhookPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: 'Test Live User' }, wa_id: testPhone }],
                messages: [
                  {
                    id: testMsgId,
                    from: testPhone,
                    type: 'text',
                    text: { body: 'Hello! Live Webhook Test Message' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await axios.post(`${baseUrl}/whatsapp/webhook`, webhookPayload);
    console.log(`✅ Webhook POST Acknowledged: ${res.data}`);
    console.log('   Waiting 1s for async message handler to process payload...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (err: any) {
    console.log('❌ Webhook POST Failed:', err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 3: Verify Persistence in DB
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Verifying Saved Conversation & Message in Database ---');
  try {
    const conversations = await whatsAppService.getConversations();
    console.log(`Found ${conversations.length} total conversation(s) in DB.`);
    const activeConv = conversations.find(
      (c) => c.contact.phone.replace(/\+/g, '').trim() === testPhone,
    );

    if (activeConv) {
      console.log(`✅ Conversation created for ${testPhone} (ID: ${activeConv.id})`);
      const thread = await whatsAppService.getConversationMessages(activeConv.id);
      console.log(`✅ Retrieved ${thread.messages.length} message(s) for conversation:`);
      thread.messages.forEach((m) => {
        console.log(`   [${m.direction}] ${m.body} (Status: ${m.status})`);
      });

      // Step 4: Outbound Reply Test
      console.log('\n--- 4. Testing Outbound Reply to Conversation ---');
      try {
        const replyRes = await whatsAppService.sendReply(
          activeConv.id,
          'Hello back from live test script!',
        );
        console.log('✅ Reply Sent Result:', replyRes);
      } catch (replyErr: any) {
        console.log('⚠️ Reply attempt note:', replyErr.message);
      }
    } else {
      console.log(`⚠️ Conversation for ${testPhone} not found in DB list.`);
    }
  } catch (err: any) {
    console.log('❌ DB verification failed:', err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 5: Send Real Template Message if requested
  // ─────────────────────────────────────────────────────────────────────────
  const sendReal = process.argv.includes('--send-real');
  if (sendReal) {
    console.log(`\n--- 5. Sending Live Meta Template Message to ${testPhone} ---`);
    try {
      const templateRes = await whatsAppService.sendTemplateMessage(
        testPhone,
        'hello_world',
        'en_US',
      );
      console.log('✅ Live Template Message Result:', templateRes);
    } catch (tmplErr: any) {
      console.log('❌ Live Template Message Failed:', tmplErr.message);
    }
  } else {
    console.log('\n💡 Tip: To send an actual live WhatsApp message to a real phone number via Meta Graph API, run:');
    console.log(`   npm run test:whatsapp-live -- --phone=${testPhone} --send-real`);
  }

  await app.close();
  console.log('\n✨ WhatsApp Live Test & Diagnostic Completed!');
}

runLiveWhatsAppTest().catch(console.error);
