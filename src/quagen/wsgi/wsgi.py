"""
WSGI driver
"""
# pylint: disable=invalid-name
from quagen import create_app

app = create_app()

if __name__ == "__main__":
    app.run()
