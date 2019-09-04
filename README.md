![Quagen](/src/quagen/static/img/quagen.png?raw=true)

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

Quagen is built with Python (>= 3.7), NodeJS (>= 10.16), [Flask][flask], 
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
     
    # Node dependencies 
    npm install
     
    # Init the SQL database
    cd src
    export PYTHONPATH=.
    python quagen/db.py


### Running

To develop Quagen, you need to fire up three(!!!) processes. Once all three are up and running, navigate 
to http://127.0.0.1:5000 to play/debug!

    # Run the API server
    cd quagen
    source venv/bin/activate
    cd src
    export FLASK_APP=quagen
    export FLASK_ENV=development   
    flask run
     
    # Run the background worker
    cd quagen
    source venv/bin/activate
    cd src
    export PYTHONPATH=.
    python quagen\worker.py
     
    # Continuously compiles the Javascript/Svelte code
    npm run autobuild

### Testing

You can run all Python tests by running the following: 

    cd quagen
    source venv/bin/activate
    python -m pytest tests -W ignore::DeprecationWarning

### Conventions

Highly suggested to integrate the tools below into your editor of choice.

All Python code is auto-formatted using [Black][black] and further linted using [Pylint][pylint]:

    cd quagen
    source venv/bin/activate
      
    # Run the python formatter
    black .
     
    # Run python linter
    pylint src tests
          

All JS/web code is auto-formatted using [Prettier][prettier] and further linted using [ESlint][eslint]

    # Run web formatter
    npm run format
     
    # Run web linter
    npm run lint 



[flask]: https://palletsprojects.com/p/flask/
[svelte]: https://svelte.dev/
[sqlite]: https://www.sqlite.org/
[black]: https://black.readthedocs.io
[pylint]: https://www.pylint.org/
[prettier]: https://prettier.io/
[eslint]: https://eslint.org