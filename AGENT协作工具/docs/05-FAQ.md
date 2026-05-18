# FAQ

## 1) lifecycle-guard failed: RULE_007_REVIEW_BY_NON_OWNER

- Symptom: gate reports missing non-owner review.
- Fix: post `[方案评审记录 / DESIGN_REVIEW]` including `Reviewer:` and ensure reviewer != owner_agent.

## 2) lifecycle-guard failed: RULE_009_BRANCH_POLICY_ENFORCED

- Symptom: PR head branch not `agent/*` or `milestone/*`.
- Fix: prefer “new branch + new PR” replacement; do not rely on remote rename to update PR metadata.

## 3) lifecycle-guard failed: RULE_010_SHARED_FILE_DECLARATION

- Symptom: shared file declaration missing.
- Fix: set `Shared Files Declared: yes` in PR body when touching shared boundaries; declare occupied paths in `STARTED`.

## 4) Bot comments do not trigger issue_comment workflows

- Symptom: a workflow listening to `issue_comment` does not run after bot comment.
- Fix: use `workflow_run` or other triggers; avoid designing a loop that depends on bot → issue_comment.

## 5) addComment permission error

- Symptom: `GraphQL: Resource not accessible by integration (addComment)`.
- Fix: ensure workflow permissions include `pull-requests: write` (or repo settings allow write).

## 6) Massive merge conflicts (add/add)

- Fix: use a rescue branch:
  - start from clean `main`
  - move only effective changes by path
  - replace PR with a new clean PR if needed

## 7) “I’m blocked, what do I read?”

- policy / allowed scope: `00-AGENT-CONSTITUTION.md`
- comment protocol / templates: `01-COLLABORATION-PROTOCOL.md`
- step-by-step workflow: `03-WORKFLOWS-AND-NORMS.md`
- where to edit: `04-ENGINEERING-INDEX.md`
- skill selection: `06-SKILLS-INVENTORY.md`
