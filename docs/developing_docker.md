# Developing Quagen with a Docker Workflow

This is the recommended way of developing for Quagen.

### Getting Started

Ensure you have Docker installed and `docker-compose` in your path. 

    git clone git@github.com:seekely/quagen.git
    cd quagen
    ./bin/setup_docker
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

Lints and formats the code. Required for builds to pass and PR acceptance:

    # Lint and format code
    ./lint_all
    ./lint_js
    ./lint_python
