"""
AI-Chan Unbuffered Tee Utility
Reads stdin line-by-line, writes immediately to stdout, and appends to a log file.
Designed for Windows CMD service windows with resilient UTF-8 encoding.
"""

import os
import sys

def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python -u tee.py <log_file_path>\n")
        sys.exit(1)

    log_path = os.path.abspath(sys.argv[1])
    try:
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
    except Exception:
        pass

    # Ensure UTF-8 input and output on Windows without encoding crashes
    if sys.platform == "win32":
        if hasattr(sys.stdin, "reconfigure"):
            try:
                sys.stdin.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass
        if hasattr(sys.stdout, "reconfigure"):
            try:
                sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass
        if hasattr(sys.stderr, "reconfigure"):
            try:
                sys.stderr.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass

    try:
        with open(log_path, "a", encoding="utf-8", errors="replace", buffering=1) as f:
            while True:
                line = sys.stdin.readline()
                if not line:
                    break
                try:
                    sys.stdout.write(line)
                    sys.stdout.flush()
                except (BrokenPipeError, IOError):
                    pass

                try:
                    f.write(line)
                    f.flush()
                except Exception:
                    pass
    except (KeyboardInterrupt, BrokenPipeError):
        pass

if __name__ == "__main__":
    main()
