[测试报告 / TEST_REPORT]

Tester: <owner_agent or tester_agent>
Task ID: <task_id>
Execution Mode: <STANDARD | PHASE_BROADCAST | STRONG_SYNC>
Unit:
- PASS | FAIL

Integration:
- PASS | FAIL

Scenario Simulation:
- normal path
- edge input
- invalid input
- upstream failure

Stress:
- PASS | FAIL | WAIVED

Decision: TEST_PASS | TEST_FAIL | RISK_ACCEPTED
Sync Recommendation: <continue parallel | direct takeover okay | strong sync required>
Scenario Evidence:
- <scenario evidence>
Evidence:
- <command output or artifact path>
