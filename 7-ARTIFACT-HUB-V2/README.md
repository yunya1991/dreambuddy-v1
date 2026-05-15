# 7-ARTIFACT-HUB-V2 (Artifact Hub + Router)

产物中台与路由（AI 治理端）服务：以 `dreambuddy/artifacts` 为产物真相源（FS），以 `dreambuddy/meta/artifact_hub.sqlite` 为元数据库（SQLite），并通过 `tasks/` 与 `results/` 目录与生产端（WorkBuddy）对接。

## Paths

- Artifacts root: `../dreambuddy/artifacts`
- Meta DB: `../dreambuddy/meta/artifact_hub.sqlite`

## Run

```bash
cd 7-ARTIFACT-HUB-V2
npm install
npm run build
node dist/index.js
```

## API

- `GET /health`
- `POST /route/decide`
- `POST /route/execute`
- `GET /traces/:traceId`
- `GET /events/stream?traceId=...` (SSE)

## Producer Contract (tasks/results)

### Task file

Path: `dreambuddy/artifacts/tasks/task_<taskId>.json`

### Result file

Path: `dreambuddy/artifacts/results/result_<taskId>.json`

The result JSON must include:

```json
{ "trace_id": "...", "task_id": "...", "status": "completed" }
```
