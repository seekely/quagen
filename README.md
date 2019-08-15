Quagen is a Go-like game where players make simultaneous moves to control 
territory on a grid board. You can see an in-development preview at 
https://quagen.io/.

# Contributions 

This is currently a personal side project, but I welcome contributions! Before 
embarking on any big change or contribution, I encourage  opening a discussion 
ticket first so we can align and avoid either one of us wasting effort. When 
opening a pull request, ensure your code has tests and follows the code styling 
tools. 
  
The repository is under the MIT license, so feel free to fork and take the 
project in your own direction!

# Development

Quagen is built with Python (>= 3.7), NodeJS(>= 10.16), [Flask][flask], 
[Svelte][svelte], and [SQLite][sqlite]. 

### Setting up

At some point this will all be containerized, but for now... 

**!!! NOTE !!! Make sure you have Python 3.7 or greater and Node 10.16 or greater installed** 

    cd quagen
     
    # Python virtual environment for dependencies
    virtualenv venv
    source venv/bin/activate
    pip install -r requirements.txt
    pip install -r requirements-dev.txt
     
    # Init the SQL database
    export FLASK_APP=quagen
    export FLASK_ENV=development    
    flask create-db
     
    # Node dependencies 
    npm install 

### Running

To develop Quagen, you need to fire up three(!!!) processes. Once all three are up and running, navigate 
to http://127.0.0.1:5001 to play/debug!

    # Run the API server
    cd quagen
    source venv/bin/activate
    export FLASK_APP=quagen
    export FLASK_ENV=development   
    flask run
     
    # Run the background worker
    cd quagen
    source venv/bin/activate
    export PYTHONPATH=.
    python quagen\worker.py
     
    # Run the front-end server
    npm run dev

### Testing

You can run all Python tests by running the following: 

    cd quagen
    source venv/bin/activate
    python -m pytest tests -W ignore::DeprecationWarning

### Conventions

All Python code is auto-formatted using [Black][black] and further linted using [Pylint][pylint]:

    cd quagen
    source venv/bin/activate
      
    # Run the formatter
    black .
     
    # Run pylint
    pylint quagen
    pylint tests




[flask]: http://flask.pocoo.org/
[svelte]: https://svelte.dev/
[sqlite]: https://www.sqlite.org/
[black]: https://black.readthedocs.io
[pylint]: https://www.pylint.org/