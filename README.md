[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) ![Build status](https://github.com/seekely/quagen/workflows/ci/badge.svg)

![Quagen](/src/quagen/static/img/quagen.png?raw=true)

![Gameplay](/src/quagen/static/img/intro.gif?raw=true)

Quagen is a Go-like game where players make simultaneous moves to control
territory on a grid board.

You can see an in-development preview at https://quagen.io/.

You can read more about the origin of the game at https://seekely.com/funthings/quagen/.

# Contributions

This is currently a personal side project, but we welcome contributions! Before
embarking on any big change or contribution, we encourage opening a
ticket first so we can have a quick chat. When opening a pull request, please
ensure your code has tests, comments, and follows the code styling tools.
  
The repository is under the MIT license, so feel free to fork and take the
project in your own direction!

Contributors to date:

* [@seekely](https://github.com/seekely)
* [@RuggeroAltair](https://github.com/RuggeroAltair)

# Development

![Build status](https://github.com/seekely/quagen/workflows/ci/badge.svg)

Quagen is built with Python (>= 3.7), NodeJS (>= 10.16), [Flask][flask],
[Svelte][svelte], and [PostgreSQL][postgres].

The recommended path for development is using [Docker][docker]:

    git clone git@github.com:seekely/quagen.git
    cd quagen
    docker-compose up

If the above succeeds, you should be able to open up a browser to
http://localhost:5000! To develop, most changes you make locally should
automatically hot reload in the containers.

For more help and information on developing Quagen:

* [Developing Quagen with Docker](docs/developing_docker.md)
* [Developing Quagen with a local installation](docs/developing_local.md) (Not Recommended)

[flask]: https://palletsprojects.com/p/flask/
[svelte]: https://svelte.dev/
[postgres]: https://www.postgresql.org/
[docker]: https://www.docker.com/get-started
