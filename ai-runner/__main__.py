import sys
from pathlib import Path

# Ensure ai-runner package folder is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from runner import main

if __name__ == "__main__":
    main()
