**WARNING: This is not the recommended way to develop for Quagen. You should 
only end up here if [Developing Quagen with a Docker](developing_docker.md) does not work for you.**


### Prerequisites

The below need to be installed for running Quagen locally:

* Python 3.7 or greater
* Node 10.16 or greater
* PostgreSQL

### Setting up

Creating environment and installing dependencies:
     
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
    python quagen/worker.py
     
    # Continuously compiles the Javascript/Svelte code
    npm run autobuild

### Testing

You can run all Python tests by running the following: 

    source venv/bin/activate
    export PYTHONPATH=src
    python -m pytest tests -W ignore::DeprecationWarning

The JS/web code tests run by:

    npm test

### Conventions

Highly suggested to integrate the tools below into your editor of choice.

All Python code is auto-formatted using [Black][black] and further linted using [Pylint][pylint]:

    source venv/bin/activate
      
    # Run the python formatter
    black .
     
    # Run python linter
    pylint_runner -v
          

All JS/web code is auto-formatted using [Prettier][prettier] and further linted using [ESlint][eslint]

    # Run web formatter
    npm run format
     
    # Run web linter
    npm run lint 

[black]: https://black.readthedocs.io
[pylint]: https://www.pylint.org/
[prettier]: https://prettier.io/
[eslint]: https://eslint.org