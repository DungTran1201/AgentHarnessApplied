import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_TEXT_EXTENSIONS,
  MAX_TEXT_FILE_SIZE_BYTES,
  isBinaryBuffer,
  splitFrontmatterAndBody,
  toKebabCase,
  extractItemMetadata,
} from '../lib/textImportParser';

test('Text File Import Specification & Invariants (Skills, Rules, System Prompts)', async (t) => {
  await t.test('1. Extension Allowlist and Size Invariants', () => {
    // Required allowlisted extensions
    const required = ['.md', '.markdown', '.txt', '.rst', '.json', '.yaml', '.yml', '.toml', '.xml', '.csv'];
    for (const ext of required) {
      assert.ok(ALLOWED_TEXT_EXTENSIONS.includes(ext as any), `Missing allowlisted extension: ${ext}`);
    }

    // Binary / executable extensions must not be in allowlist
    const forbidden = ['.exe', '.dll', '.bin', '.zip', '.tar', '.gz', '.pyc', '.so', '.dylib', '.sh', '.bat'];
    for (const ext of forbidden) {
      assert.ok(!ALLOWED_TEXT_EXTENSIONS.includes(ext as any), `Forbidden extension present: ${ext}`);
    }

    // Max file size must be exactly 5MB
    assert.equal(MAX_TEXT_FILE_SIZE_BYTES, 5 * 1024 * 1024);
  });

  await t.test('2. Binary Content Detection', () => {
    // Normal text buffer
    const textBytes = new TextEncoder().encode('Hello, this is plain text content.');
    assert.equal(isBinaryBuffer(textBytes), false);

    // Buffer with null byte (binary file signature)
    const binaryWithNull = new Uint8Array([0x48, 0x65, 0x00, 0x6c, 0x6f]);
    assert.equal(isBinaryBuffer(binaryWithNull), true);

    // Buffer with excessive control characters (e.g. byte < 32 not 9, 10, 13)
    const excessiveControl = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x20]);
    assert.equal(isBinaryBuffer(excessiveControl), true);
  });

  await t.test('3. Frontmatter and Body Separation', () => {
    // Valid YAML frontmatter
    const mdWithFm = `---
name: pdf-extractor
description: Extracts text from PDFs
license: MIT
---
# PDF Extractor Instructions

Steps to follow...`;

    const res1 = splitFrontmatterAndBody(mdWithFm);
    assert.ok(res1.frontmatter !== null);
    assert.equal(res1.frontmatter?.name, 'pdf-extractor');
    assert.equal(res1.frontmatter?.description, 'Extracts text from PDFs');
    assert.equal(res1.frontmatter?.license, 'MIT');
    assert.ok(res1.body.startsWith('# PDF Extractor Instructions'));

    // Text without frontmatter
    const plainText = `# Just a title\nSome simple content.`;
    const res2 = splitFrontmatterAndBody(plainText);
    assert.equal(res2.frontmatter, null);
    assert.equal(res2.body, plainText);
  });

  await t.test('4. Agent Skills kebab-case Normalization', () => {
    assert.equal(toKebabCase('My Custom Skill'), 'my-custom-skill');
    assert.equal(toKebabCase('code_review_tool_2026!'), 'code-review-tool-2026');
    assert.equal(toKebabCase('--leading-trailing--'), 'leading-trailing');
    assert.equal(toKebabCase('Data---Science--Helper'), 'data-science-helper');
    assert.equal(toKebabCase(''), 'custom-skill');
  });

  await t.test('5. Metadata Extraction for Skills Library', () => {
    const rawSkill = `---
name: code-reviewer
description: Senior code reviewer assistant
allowed-tools: git, diff
---
# Instructions
Review pull requests.`;

    const meta = extractItemMetadata('skills', 'SKILL.md', rawSkill, 512);
    assert.equal(meta.name, 'code-reviewer');
    assert.equal(meta.description, 'Senior code reviewer assistant');
    assert.equal(meta.allowed_tools, 'git, diff');
    assert.equal(meta.validationErrors.length, 0);

    // Plain text fallback to filename
    const plainMeta = extractItemMetadata('skills', 'security_audit_helper.txt', 'Audits source code.', 200);
    assert.equal(plainMeta.name, 'security-audit-helper');
    assert.ok(plainMeta.description.includes('security_audit_helper.txt'));
  });

  await t.test('6. Metadata Extraction for Rules Library', () => {
    const ruleContent = `---
name: Clean Architecture Rule
description: Must follow domain layer isolation
activation_mode: glob
glob_patterns:
  - 'src/**/*.ts'
priority: 85
tags:
  - architecture
  - security
---
Domain models must not import UI or infra services.`;

    const meta = extractItemMetadata('rules', 'clean_arch.md', ruleContent, 1024);
    assert.equal(meta.name, 'Clean Architecture Rule');
    assert.equal(meta.activation_mode, 'glob');
    assert.deepEqual(meta.glob_patterns, ['src/**/*.ts']);
    assert.equal(meta.priority, 85);
    assert.deepEqual(meta.tags, ['architecture', 'security']);

    // Heading fallback
    const noFmRule = `# Security First Rule\nAlways validate user tokens before executing commands.`;
    const headingMeta = extractItemMetadata('rules', 'security.txt', noFmRule, 200);
    assert.equal(headingMeta.name, 'Security First Rule');
    assert.equal(headingMeta.activation_mode, 'always_on');
    assert.equal(headingMeta.priority, 50);
  });

  await t.test('7. Metadata Extraction for System Prompts Library', () => {
    const promptText = `Bạn là Trợ lý AI-Chan thông minh 🌟.\nNgữ cảnh: {context}\nNgười dùng hỏi: {query}`;
    const meta = extractItemMetadata('prompts', 'ai_chan_assistant.txt', promptText, 300);

    assert.equal(meta.name, 'ai chan assistant');
    assert.ok(meta.content.includes('AI-Chan thông minh 🌟'));
    assert.ok(meta.content.includes('{context}'));
    assert.ok(meta.content.includes('{query}'));
  });

  await t.test('8. Collision / Duplicate Detection Logic', () => {
    const existing = ['Code Reviewer', 'Security Rule', 'ai chan persona'];

    // Duplicate match (case-insensitive)
    const candidate1 = 'code reviewer';
    const isDup1 = existing.some(e => e.trim().toLowerCase() === candidate1.trim().toLowerCase());
    assert.equal(isDup1, true);

    // Non-duplicate match
    const candidate2 = 'Code Reviewer v2';
    const isDup2 = existing.some(e => e.trim().toLowerCase() === candidate2.trim().toLowerCase());
    assert.equal(isDup2, false);
  });
});
