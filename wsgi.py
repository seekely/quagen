"""
WSGI driver
"""

import os
import sys
from quagen import create_app


def main():
    """
    Creates our WSGI app
    """
    new_path = os.path.dirname(os.path.abspath(__file__)) + "/src"
    sys.path.insert(0, new_path)
    os.chdir(new_path)

    app = create_app()
    app.run()


if __name__ == "__main__":
    main()
