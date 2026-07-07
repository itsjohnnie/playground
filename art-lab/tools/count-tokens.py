#!/usr/bin/env python3
"""Sum token usage across every Claude session transcript for this repo.
The result feeds the 'tokens spent so far' line on johnnie/public/art/index.html
— update that line whenever a session ends. Total = fresh input + output +
cache writes + cache reads (every token the models actually processed)."""
import json, glob
tot = {"input": 0, "output": 0, "cache_write": 0, "cache_read": 0}
for f in glob.glob("/root/.claude/projects/-home-user-playground/**/*.jsonl", recursive=True):
    with open(f) as fh:
        for line in fh:
            try:
                u = (json.loads(line).get("message") or {}).get("usage")
            except Exception:
                continue
            if not u:
                continue
            tot["input"] += u.get("input_tokens") or 0
            tot["output"] += u.get("output_tokens") or 0
            tot["cache_write"] += u.get("cache_creation_input_tokens") or 0
            tot["cache_read"] += u.get("cache_read_input_tokens") or 0
print(tot, "\ntotal:", f'{sum(tot.values()):,}')
