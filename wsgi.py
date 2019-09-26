"""
WSGI driver
"""
# pylint: disable=invalid-name
# pylint: disable=wrong-import-position

import os
import sys

# Add Quagen code to path
new_path = os.path.dirname(os.path.abspath(__file__)) + "/src"
sys.path.insert(0, new_path)
os.chdir(new_path)
from quagen import create_app

app = create_app()

if __name__ == "__main__":
    app.run()
