FROM python:3.8-alpine3.11

RUN apk update \
    && apk add --no-cache \
    && apk add build-base \
    && apk add inotify-tools \
    && apk add postgresql-client \
    && apk add postgresql-dev \
    && rm -rf /var/cache/apk/*

WORKDIR /app

COPY deploy/docker/worker/reloader.sh ./

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/quagen quagen/

ENV PYTHONPATH=.
CMD [ "./reloader.sh" ]

