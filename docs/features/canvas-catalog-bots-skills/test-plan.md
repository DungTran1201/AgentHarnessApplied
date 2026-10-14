# Test Plan and Verification Report: Canvas Catalog Bots and Skills

## 1. Test Suite Summary
| Suite | File | Tests | Status |
|---|---|---|---|
| Frontend Connection & Catalog | `ai-frontend/src/tests/projectCanvasCatalog.test.ts` | 10 | **PASSED** |
| Frontend Navigation & Access | `ai-frontend/src/tests/botNavigationAccess.test.ts` | 7 | **PASSED** |
| Frontend Floating Chat | `ai-frontend/src/tests/floatingChatResize.test.ts` | 5 | **PASSED** |
| Backend Bot & Skills Graph | `ai-backend/tests/test_project_bot_skill_graph.py` | 9 | **PASSED** |
| Backend Project Management | `ai-backend/tests/test_projects.py` | 9 | **PASSED** |
| Backend Skills API | `ai-backend/tests/test_skills_api.py` | 12 | **PASSED** |
| Backend Bot Management | `ai-backend/tests/test_discord_bot_management.py` | 8 | **PASSED** |

---

## 2. Tested Business Invariants
1. **Single Bot Constraint**:
   - `Model -> Bot` allowed once.
   - Second connection attempt rejected in UI with exact message: `"This model can be connected to only one bot. Remove the existing bot connection before selecting another."`
   - Second connection attempt rejected in backend validation (`422 Unprocessable Entity`).
   - Existing bot connection is never silently overwritten or removed.
2. **Multiple Skills Support**:
   - `Model -> Skill_1` and `Model -> Skill_2` successfully connected simultaneously.
   - Duplicate edge to same skill rejected.
   - Adding or removing skills does not detach connected bot.
3. **Reverse Connection Prohibition**:
   - `Bot -> Model` rejected (UI & Backend).
   - `Skill -> Model` rejected (UI & Backend).
4. **Discord Linkage Enforcement**:
   - `/api/v1/bot/discord/available` returns 403 `DISCORD_NOT_LINKED` when account has no Discord identity.
   - Backend graph validator rejects bot nodes for unlinked users (`422 Unprocessable Entity`).
5. **Runtime Resolution & Execution**:
   - SSE `start` event deterministically includes `bot` instance details and `skills` array.
   - Prompt instructions are augmented with active skills markdown instructions and guidelines.
   - Backward compatibility: 0-bot and 0-skill graphs validate, save, and chat normally.
