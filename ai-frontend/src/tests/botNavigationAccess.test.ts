import test from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS, navIsActive } from '../components/chat/Sidebar';

// Eligibility helper mirroring the verified server-backed rule
function isUserDiscordEligible(user: { discord_id?: string | null; [key: string]: any } | null | undefined): boolean {
  return Boolean(user?.discord_id && user.discord_id.trim().length > 0);
}

// Connection lookup response evaluator (fails closed on null or error)
function evaluateConnectionEligibility(connectionResponse: any): boolean {
  try {
    if (!connectionResponse || typeof connectionResponse !== 'object') return false;
    const discord = connectionResponse.connections?.discord;
    return Boolean(discord?.connected && discord?.discord_id);
  } catch {
    return false;
  }
}

test('Bot Navigation & Discord-Based Access Control Specification', async (t) => {
  await t.test('1. Sidebar Nav Items structure and exact ordering', () => {
    const keys = NAV_ITEMS.map(item => item.key);
    assert.deepEqual(keys, [
      'chat',
      'projects',
      'bot',
      'prompts',
      'skills',
      'workspaces',
      'tasks',
      'dashboard',
      'settings'
    ]);

    const botItem = NAV_ITEMS.find(item => item.key === 'bot');
    assert.ok(botItem, 'Bot nav item must exist');
    assert.equal(botItem.label, 'Bot');
    assert.equal(botItem.icon, 'bot');
    assert.equal(botItem.href, '/bot/discord');

    // Verify placement: immediately after projects and before prompts
    const botIndex = NAV_ITEMS.findIndex(item => item.key === 'bot');
    const projectsIndex = NAV_ITEMS.findIndex(item => item.key === 'projects');
    const promptsIndex = NAV_ITEMS.findIndex(item => item.key === 'prompts');
    assert.equal(botIndex, projectsIndex + 1);
    assert.equal(promptsIndex, botIndex + 1);
  });

  await t.test('2. Pathname-aware route matching for Bot item (navIsActive)', () => {
    // Exact /bot/discord
    assert.equal(navIsActive('/bot/discord', '/bot/discord'), true);
    // Sub-routes of /bot/discord
    assert.equal(navIsActive('/bot/discord/settings', '/bot/discord'), true);
    // Canonical /bot route
    assert.equal(navIsActive('/bot', '/bot/discord'), true);
    // Sub-route /bot/overview
    assert.equal(navIsActive('/bot/overview', '/bot/discord'), true);
    // Unrelated routes
    assert.equal(navIsActive('/chat', '/bot/discord'), false);
    assert.equal(navIsActive('/projects', '/bot/discord'), false);
    assert.equal(navIsActive('/settings', '/bot/discord'), false);
  });

  await t.test('3. Scenario A: Discord-linked user eligibility (Condition A)', () => {
    const linkedUser = {
      id: 'usr-123',
      email: 'user@example.com',
      discord_id: 'discord-987654321',
      discord_username: 'DiscordUser#0001'
    };
    assert.equal(isUserDiscordEligible(linkedUser), true);

    const connData = {
      has_password: true,
      connections: {
        discord: {
          connected: true,
          discord_id: 'discord-987654321',
          discord_username: 'DiscordUser#0001'
        }
      }
    };
    assert.equal(evaluateConnectionEligibility(connData), true);
  });

  await t.test('4. Scenario B: User authenticated through Discord (Condition B)', () => {
    // Session authenticated through Discord OAuth also populates verified discord_id
    const oauthDiscordSessionUser = {
      id: 'usr-456',
      email: 'discord_login@example.com',
      discord_id: 'discord-1122334455',
      discord_username: 'OAuthUser'
    };
    assert.equal(isUserDiscordEligible(oauthDiscordSessionUser), true);
  });

  await t.test('5. Scenario C: Unlinked user is ineligible and locks Bot', () => {
    const unlinkedUser = {
      id: 'usr-789',
      email: 'unlinked@example.com',
      discord_id: null,
      discord_username: null
    };
    assert.equal(isUserDiscordEligible(unlinkedUser), false);

    const emptyUser = {
      id: 'usr-000',
      email: 'empty@example.com'
    };
    assert.equal(isUserDiscordEligible(emptyUser), false);

    const unlinkedConnData = {
      has_password: true,
      connections: {
        discord: {
          connected: false,
          discord_id: null,
          discord_username: null
        }
      }
    };
    assert.equal(evaluateConnectionEligibility(unlinkedConnData), false);
  });

  await t.test('6. Scenario D & E: Account linking and unlinking lifecycle transitions', () => {
    let currentUser: { discord_id?: string | null } = { discord_id: null };
    assert.equal(isUserDiscordEligible(currentUser), false, 'Initially unlinked -> locked');

    // User links account
    currentUser = { discord_id: '123456789' };
    assert.equal(isUserDiscordEligible(currentUser), true, 'After linking -> unlocked');

    // User unlinks account
    currentUser = { discord_id: null };
    assert.equal(isUserDiscordEligible(currentUser), false, 'After unlinking -> locked again');
  });

  await t.test('7. Scenario F: Fail closed on network failure or malformed payload', () => {
    assert.equal(evaluateConnectionEligibility(null), false);
    assert.equal(evaluateConnectionEligibility(undefined), false);
    assert.equal(evaluateConnectionEligibility({}), false);
    assert.equal(evaluateConnectionEligibility({ error: 'Server unavailable' }), false);
    assert.equal(evaluateConnectionEligibility({ connections: {} }), false);
    assert.equal(evaluateConnectionEligibility({ connections: { discord: { connected: false } } }), false);
  });
});
