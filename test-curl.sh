#!/bin/bash
curl -N -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-stream-'"$(date +%s)"'", "message": "hello"}'
