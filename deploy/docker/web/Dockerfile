FROM python:3.8-alpine3.11

RUN apk update \
    && apk add --no-cache \
    && apk add build-base \
    && apk add linux-headers \
    && apk add musl-dev \
    && apk add postgresql-client \
    && apk add postgresql-dev \
    && rm -rf /var/cache/apk/*

WORKDIR /app
ARG QUAGEN_TESTING="no"

COPY requirements.txt ./
COPY requirements-dev.txt ./
COPY deploy/docker/web/install_deps.sh ./

RUN if [ "$QUAGEN_TESTING" = "no" ]; then rm -fr requirements-dev.txt; fi
RUN source install_deps.sh

COPY .pylintrc ./
COPY pyproject.toml ./
COPY src/quagen quagen/
COPY src/quagen/wsgi/* ./
COPY tests tests
RUN if [ "$QUAGEN_TESTING" = "no" ]; then rm -fr tests; fi

ENV PYTHONUNBUFFERED=0
ENV FLASK_APP=quagen
ENV FLASK_ENV=production
ENV FLASK_RUN_HOST 0.0.0.0
CMD [ "uwsgi", "--ini", "wsgi.ini" ]

