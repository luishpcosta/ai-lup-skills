#!/bin/bash
set -e

echo "=== SDD Harness Initialization ==="

echo "=== (cd cli && npm install && npm test) ==="
(cd cli && npm install && npm test)

echo "=== node --test skills/sdd-harness-creator/test/*.test.mjs ==="
node --test skills/sdd-harness-creator/test/*.test.mjs

echo "=== Traceability Gate ==="
node skills/sdd-harness-creator/scripts/check-traceability.mjs --target . || {
  echo "Traceability gate failed. Resolve orphans/clarifications before continuing." >&2
  exit 1
}

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Run skills/sdd-harness-creator/scripts/registry-status.mjs to see each feature's SDD phase"
echo "2. Advance ONE feature through the flow (Specify -> Clarify -> Plan -> Tasks -> Implement -> Verify)"
echo "3. Do not start a phase before the previous gate passes"
echo "4. Re-run ./init.sh before claiming a feature done"
