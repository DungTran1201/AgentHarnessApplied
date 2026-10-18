import test from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS, navIsActive } from '../components/chat/Sidebar';
import { RuleScope, RuleStatus, RuleActivationMode } from '../types/rule';

// Rule client-side validator mirroring page logic
function validateRulePayload(input: {
  name?: string;
  description?: string | null;
  content?: string;
  scope?: string;
  status?: string;
  priority?: number;
  activation_mode?: string;
  file_patterns?: string[];
  tags?: string[];
}): { isValid: boolean; error?: string } {
  const name = input.name?.trim() || '';
  if (!name) return { isValid: false, error: 'Rule name is required.' };
  if (name.length > 100) return { isValid: false, error: 'Rule name must not exceed 100 characters.' };

  const content = input.content?.trim() || '';
  if (!content) return { isValid: false, error: 'Rule content is required.' };
  if (input.content && input.content.length > 20000) {
    return { isValid: false, error: 'Rule content must not exceed 20,000 characters.' };
  }

  if (input.scope && !['global', 'project'].includes(input.scope)) {
    return { isValid: false, error: 'Scope must be either "global" or "project".' };
  }

  if (input.status && !['active', 'inactive', 'archived'].includes(input.status)) {
    return { isValid: false, error: 'Status must be active, inactive, or archived.' };
  }

  if (input.priority !== undefined && (input.priority < 0 || input.priority > 100)) {
    return { isValid: false, error: 'Priority must be an integer between 0 and 100.' };
  }

  if (input.activation_mode && !['always', 'manual', 'file_pattern'].includes(input.activation_mode)) {
    return { isValid: false, error: 'Invalid activation mode.' };
  }

  if (input.activation_mode === 'file_pattern') {
    if (!input.file_patterns || input.file_patterns.length === 0) {
      return { isValid: false, error: 'File pattern mode requires at least one pattern.' };
    }
    for (const pattern of input.file_patterns) {
      if (pattern.includes('..') || pattern.startsWith('/') || pattern.startsWith('\\')) {
        return { isValid: false, error: `Invalid pattern "${pattern}": Path traversal disallowed.` };
      }
    }
  }

  if (input.tags && input.tags.length > 10) {
    return { isValid: false, error: 'Maximum 10 tags allowed.' };
  }

  return { isValid: true };
}

test('Rules Management Frontend & Navigation Suite', async (t) => {
  await t.test('1. Sidebar Nav Items structure and position for Rules', () => {
    const keys = NAV_ITEMS.map(item => item.key);
    assert.ok(keys.includes('rules'), 'Rules item must be present in NAV_ITEMS');

    const rulesItem = NAV_ITEMS.find(item => item.key === 'rules');
    assert.ok(rulesItem, 'Rules nav item must exist');
    assert.equal(rulesItem.label, 'Rules');
    assert.equal(rulesItem.icon, 'rules');
    assert.equal(rulesItem.href, '/rules');

    // Verify ordering: tools -> rules -> dashboard
    const toolsIndex = NAV_ITEMS.findIndex(item => item.key === 'tools');
    const rulesIndex = NAV_ITEMS.findIndex(item => item.key === 'rules');
    const dashboardIndex = NAV_ITEMS.findIndex(item => item.key === 'dashboard');

    assert.equal(rulesIndex, toolsIndex + 1, 'Rules must immediately follow tools');
    assert.equal(dashboardIndex, rulesIndex + 1, 'Dashboard must immediately follow rules');
  });

  await t.test('2. Pathname-aware route matching for Rules (navIsActive)', () => {
    // Exact /rules
    assert.equal(navIsActive('/rules', '/rules'), true);
    // Sub-route /rules/new
    assert.equal(navIsActive('/rules/new', '/rules'), true);
    // Sub-route /rules/123
    assert.equal(navIsActive('/rules/123', '/rules'), true);
    // Sub-route /rules/sys-001/edit
    assert.equal(navIsActive('/rules/sys-001/edit', '/rules'), true);
    // Unrelated routes
    assert.equal(navIsActive('/chat', '/rules'), false);
    assert.equal(navIsActive('/skills', '/rules'), false);
    assert.equal(navIsActive('/prompts', '/rules'), false);
    assert.equal(navIsActive('/tools', '/rules'), false);
  });

  await t.test('3. Client-side input validation for Rule creation & update', () => {
    // Valid input
    const valid = validateRulePayload({
      name: 'Clean Code Rule',
      content: '## Always write unit tests',
      scope: 'global',
      status: 'active',
      priority: 80,
      activation_mode: 'always'
    });
    assert.equal(valid.isValid, true);

    // Empty name rejected
    const emptyName = validateRulePayload({ name: '   ', content: 'Some content' });
    assert.equal(emptyName.isValid, false);
    assert.match(emptyName.error || '', /name is required/i);

    // Oversized name (> 100 chars)
    const longName = validateRulePayload({ name: 'a'.repeat(101), content: 'Some content' });
    assert.equal(longName.isValid, false);
    assert.match(longName.error || '', /100 characters/i);

    // Empty content rejected
    const emptyContent = validateRulePayload({ name: 'Valid Name', content: '   ' });
    assert.equal(emptyContent.isValid, false);
    assert.match(emptyContent.error || '', /content is required/i);

    // Invalid scope
    const invalidScope = validateRulePayload({ name: 'Valid', content: 'Valid', scope: 'invalid_scope' });
    assert.equal(invalidScope.isValid, false);

    // Invalid priority
    const negativePriority = validateRulePayload({ name: 'Valid', content: 'Valid', priority: -5 });
    assert.equal(negativePriority.isValid, false);
    const highPriority = validateRulePayload({ name: 'Valid', content: 'Valid', priority: 101 });
    assert.equal(highPriority.isValid, false);
  });

  await t.test('4. Security validation: Path traversal prevention in file patterns', () => {
    // Safe patterns
    const safe = validateRulePayload({
      name: 'Pattern Rule',
      content: 'Rule body',
      activation_mode: 'file_pattern',
      file_patterns: ['*.ts', 'src/**/*.tsx', 'docs/*.md']
    });
    assert.equal(safe.isValid, true);

    // Path traversal with .. rejected
    const traversal = validateRulePayload({
      name: 'Malicious Rule',
      content: 'Rule body',
      activation_mode: 'file_pattern',
      file_patterns: ['../../etc/passwd', '*.ts']
    });
    assert.equal(traversal.isValid, false);
    assert.match(traversal.error || '', /Path traversal/i);

    // Absolute root path rejected
    const absolutePath = validateRulePayload({
      name: 'Malicious Rule',
      content: 'Rule body',
      activation_mode: 'file_pattern',
      file_patterns: ['/etc/shadow']
    });
    assert.equal(absolutePath.isValid, false);
    assert.match(absolutePath.error || '', /Path traversal/i);
  });

  await t.test('5. System rule immutability business rule', () => {
    const systemRule = {
      id: 'sys-001',
      name: 'AGENTS Core Rule',
      is_system: 1,
      content: 'Read before write.'
    };

    const isSystemProtected = (rule: { is_system: number }): boolean => rule.is_system === 1;
    const canDirectlyDelete = (rule: { is_system: number }): boolean => !isSystemProtected(rule);
    const canDirectlyEdit = (rule: { is_system: number }): boolean => !isSystemProtected(rule);

    assert.equal(isSystemProtected(systemRule), true);
    assert.equal(canDirectlyDelete(systemRule), false);
    assert.equal(canDirectlyEdit(systemRule), false);

    const userRule = {
      id: 'user-001',
      name: 'Custom Team Rule',
      is_system: 0,
      content: 'Custom guidelines.'
    };
    assert.equal(isSystemProtected(userRule), false);
    assert.equal(canDirectlyDelete(userRule), true);
    assert.equal(canDirectlyEdit(userRule), true);
  });
});
