import json
from pathlib import Path

hooks = json.loads(Path('.agents/hooks.json').read_text(encoding='utf-8'))
valid_events = {'PreToolUse','PostToolUse','PreInvocation','PostInvocation','Stop'}
errors = 0
for name, cfg in hooks.items():
    if not isinstance(cfg, dict):
        print(f'[ERROR] {name}: hook definition must be an object')
        errors += 1
        continue
    for event, body in cfg.items():
        if event == 'enabled':
            if not isinstance(body, bool):
                print(f'[ERROR] {name}: enabled must be boolean')
                errors += 1
            continue
        if event not in valid_events:
            print(f'[ERROR] {name}: unsupported event key {event}')
            errors += 1
            continue
        if not isinstance(body, list):
            print(f'[ERROR] {name}.{event}: must be an array')
            errors += 1
            continue
        if event in {'PreToolUse','PostToolUse'}:
            for entry in body:
                if not isinstance(entry, dict) or 'matcher' not in entry or 'hooks' not in entry:
                    print(f'[ERROR] {name}.{event}: matcher/hooks required')
                    errors += 1
        else:
            for entry in body:
                for handler in entry.get('hooks', [entry]) if isinstance(entry, dict) else []:
                    if handler.get('type','command') != 'command' or 'command' not in handler:
                        print(f'[ERROR] {name}.{event}: command handler required')
                        errors += 1
print(f'Hook validation: {errors} error(s)')
raise SystemExit(1 if errors else 0)
