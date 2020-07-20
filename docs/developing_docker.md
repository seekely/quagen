# Developing Quagen with a Docker Workflow

This is the recommended way of developing for Quagen.

### Getting Started

Ensure you have Docker installed and `docker-compose` in your path. 

    git clone git@github.com:seekely/quagen.git
    cd quagen
    docker-compose up

If the above succeeds, you should be able to open up a browser to 
http://localhost:5000! To develop, most changes you make locally should 
automatically hot reload in the containers.


### Running tests

A set of shell scripts will run various parts of Quagen's testing via Docker:

    # Run all tests (Python/JS and Unit/Profile)
    ./bin/test_all
     
    # Run parts of Python tests
    ./bin/test_profile_python
    ./bin/test_unit_python
     
    # Run parts of JS tests  
    ./bin/test_unit_js


### Enforcing conventions

Lints and formats the code. Required for builds to pass and PR acceptance. Highly suggested to integrate [Black][black], [Pylint][pylint], [Prettier][prettier], and [ESlint][eslint] into your editor of choice.


    # Lint and format code
    ./bin/lint_all
    ./bin/lint_js
    ./bin/lint_python

[black]: https://black.readthedocs.io
[pylint]: https://www.pylint.org/
[prettier]: https://prettier.io/
[eslint]: https://eslint.org