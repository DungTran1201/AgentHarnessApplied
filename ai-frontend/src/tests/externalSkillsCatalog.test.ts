import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { SkillService } from '../services/skillService';
import {
  ExternalCatalogProvider,
  ExternalCatalogSearchResponse,
  ExternalSkillDetail,
  ExternalSkillConflictDetail,
  SkillProvenance,
} from '../types';

describe('External Skills Catalog & Awesome Skills Integration Specification', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('1. getExternalProviders retrieves provider inventory with canonical URL and license policy', async () => {
    const mockProviders: ExternalCatalogProvider[] = [
      {
        id: 'awesome-skills',
        name: 'Awesome Skills (Agentic Community Catalog)',
        canonical_url: 'https://github.com/sickn33/agentic-awesome-skills',
        redirected_from: 'https://github.com/sickn33/antigravity-awesome-skills',
        status: 'connected',
        total_skills: 2705,
        last_synced_at: '2026-02-28T00:00:00Z',
        is_stale: false,
        license_policy: 'CC-BY-4.0 (Content), MIT (Code)',
        attribution_requirement: 'Bắt buộc ghi nhận nguồn tác giả cộng đồng Awesome Skills',
      },
    ];

    global.fetch = async (url: any) => {
      assert.ok(String(url).endsWith('/skills/external/providers'));
      return {
        ok: true,
        json: async () => mockProviders,
      } as Response;
    };

    const providers = await SkillService.getExternalProviders();
    assert.strictEqual(providers.length, 1);
    assert.strictEqual(providers[0].id, 'awesome-skills');
    assert.strictEqual(providers[0].canonical_url, 'https://github.com/sickn33/agentic-awesome-skills');
    assert.strictEqual(providers[0].total_skills, 2705);
    assert.ok(providers[0].license_policy.includes('CC-BY-4.0'));
  });

  it('2. searchExternalSkills constructs query parameters and returns paginated results', async () => {
    let capturedUrl = '';

    const mockResponse: ExternalCatalogSearchResponse = {
      items: [
        {
          id: 'react-best-practices',
          path: 'skills/react-best-practices',
          category: 'development',
          name: 'React Best Practices',
          description: 'Guide for clean and performant React development.',
          risk: 'safe',
          source: 'community',
          date_added: '2025-01-10',
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
      total_pages: 1,
      categories: [{ name: 'development', count: 1 }],
      is_stale: false,
    };

    global.fetch = async (url: any) => {
      capturedUrl = String(url);
      return {
        ok: true,
        json: async () => mockResponse,
      } as Response;
    };

    const result = await SkillService.searchExternalSkills({
      q: 'react',
      category: 'development',
      risk: 'safe',
      page: 1,
      limit: 12,
    });

    assert.ok(capturedUrl.includes('q=react'));
    assert.ok(capturedUrl.includes('category=development'));
    assert.ok(capturedUrl.includes('risk=safe'));
    assert.ok(capturedUrl.includes('page=1'));
    assert.ok(capturedUrl.includes('limit=12'));

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].id, 'react-best-practices');
    assert.strictEqual(result.categories[0].name, 'development');
  });

  it('3. getExternalSkillDetail fetches metadata, frontmatter, body and security assessment', async () => {
    const mockDetail: ExternalSkillDetail = {
      source_provider: 'awesome-skills',
      source_repository_url: 'https://github.com/sickn33/agentic-awesome-skills',
      source_skill_id: 'security-scanner',
      source_path: 'skills/security-scanner',
      source_version: 'main',
      source_content_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      source_license: 'CC-BY-4.0',
      attribution: 'Community contributors from sickn33/agentic-awesome-skills',
      name: 'Security Scanner',
      description: 'Audits openapi specs for security leaks.',
      category: 'security',
      risk: 'sensitive',
      raw_content: '---\nname: security-scanner\n---\n# Instructions',
      frontmatter: 'name: security-scanner',
      markdown_body: '# Instructions',
      security_assessment: {
        risk_level: 'SAFE',
        warnings: [],
        is_safe_to_preview: true,
        has_prompt_injection_warning: false,
      },
      is_imported: false,
    };

    global.fetch = async (url: any) => {
      assert.ok(String(url).includes('/skills/external/awesome/skills/security-scanner'));
      return {
        ok: true,
        json: async () => mockDetail,
      } as Response;
    };

    const detail = await SkillService.getExternalSkillDetail('security-scanner');
    assert.strictEqual(detail.source_skill_id, 'security-scanner');
    assert.strictEqual(detail.source_provider, 'awesome-skills');
    assert.strictEqual(detail.security_assessment.risk_level, 'SAFE');
    assert.strictEqual(detail.source_content_hash.length, 64);
    assert.strictEqual(detail.is_imported, false);
  });

  it('4. importExternalSkill handles successful import and attaches local skill ID', async () => {
    let capturedBody: any = null;

    global.fetch = async (url: any, init?: RequestInit) => {
      assert.ok(String(url).includes('/skills/external/awesome/skills/react-best-practices/import'));
      assert.strictEqual(init?.method, 'POST');
      capturedBody = JSON.parse(String(init?.body));
      return {
        ok: true,
        json: async () => ({
          imported: true,
          status: 'CREATED',
          message: 'Skill imported successfully',
          skill_id: 'skl_abc123',
          name: 'react-best-practices',
          is_valid: true,
        }),
      } as Response;
    };

    const res = await SkillService.importExternalSkill('react-best-practices', {
      target_name: 'react-best-practices',
    });

    assert.strictEqual(res.imported, true);
    assert.strictEqual(res.status, 'CREATED');
    assert.strictEqual(res.skill_id, 'skl_abc123');
    assert.strictEqual(capturedBody.target_name, 'react-best-practices');
  });

  it('5. importExternalSkill handles 409 conflict and extracts structured conflict details', async () => {
    const conflictDetail: ExternalSkillConflictDetail = {
      code: 'SKILL_IMPORT_CONFLICT',
      message: 'Kỹ năng đã tồn tại trong thư viện của bạn.',
      conflict_type: 'DUPLICATE_SOURCE',
      existing_skill_id: 'skl_existing_001',
      existing_skill_name: 'react-best-practices',
      is_locally_modified: true,
      supported_actions: ['RENAME', 'REPLACE', 'SKIP'],
    };

    global.fetch = async () => {
      return {
        ok: false,
        status: 409,
        json: async () => ({
          detail: conflictDetail,
        }),
      } as Response;
    };

    try {
      await SkillService.importExternalSkill('react-best-practices');
      assert.fail('Should have thrown conflict error');
    } catch (err: any) {
      assert.ok(err.conflict);
      assert.strictEqual(err.conflict.code, 'SKILL_IMPORT_CONFLICT');
      assert.strictEqual(err.conflict.conflict_type, 'DUPLICATE_SOURCE');
      assert.strictEqual(err.conflict.is_locally_modified, true);
      assert.deepStrictEqual(err.conflict.supported_actions, ['RENAME', 'REPLACE', 'SKIP']);
    }
  });

  it('6. getSkillProvenance retrieves source origin and detects local modifications', async () => {
    const mockProvenance: SkillProvenance = {
      skill_id: 'skl_existing_001',
      name: 'react-best-practices',
      is_imported: true,
      source_type: 'IMPORTED',
      source_provider: 'awesome-skills',
      source_repository_url: 'https://github.com/sickn33/agentic-awesome-skills',
      source_skill_id: 'react-best-practices',
      source_path: 'skills/react-best-practices',
      source_version: 'main',
      source_content_hash: '1111111111111111111111111111111111111111111111111111111111111111',
      current_content_hash: '2222222222222222222222222222222222222222222222222222222222222222',
      is_locally_modified: true,
      source_license: 'CC-BY-4.0',
      attribution: 'Awesome Skills Community',
      imported_at: '2026-02-28T10:00:00Z',
      source_updated_at: '2026-02-28T10:00:00Z',
      source_status: 'current',
    };

    global.fetch = async (url: any) => {
      assert.ok(String(url).endsWith('/skills/skl_existing_001/source'));
      return {
        ok: true,
        json: async () => mockProvenance,
      } as Response;
    };

    const prov = await SkillService.getSkillProvenance('skl_existing_001');
    assert.strictEqual(prov.is_imported, true);
    assert.strictEqual(prov.source_provider, 'awesome-skills');
    assert.strictEqual(prov.is_locally_modified, true);
    assert.notStrictEqual(prov.source_content_hash, prov.current_content_hash);
  });

  it('7. refreshExternalCatalog triggers remote sync and returns refresh status', async () => {
    global.fetch = async (url: any, init?: RequestInit) => {
      assert.ok(String(url).endsWith('/skills/external/awesome/refresh'));
      assert.strictEqual(init?.method, 'POST');
      return {
        ok: true,
        json: async () => ({
          refreshed: true,
          total_skills: 2705,
          is_stale: false,
          last_synced_at: '2026-02-28T12:00:00Z',
        }),
      } as Response;
    };

    const refreshRes = await SkillService.refreshExternalCatalog();
    assert.strictEqual(refreshRes.refreshed, true);
    assert.strictEqual(refreshRes.total_skills, 2705);
    assert.strictEqual(refreshRes.is_stale, false);
  });
});
