FROM python:3.8-alpine3.11

RUN apk update \
    && apk add --no-cache \
    && apk add build-base \
    && apk add inotify-tools \
    && apk add linux-headers \
    && apk add musl-dev \
    && apk add postgresql-client \
    && apk add postgresql-dev \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# When running locally for development, we will use a reloader script for 
# hot restarting
COPY deploy/docker/worker/reloader.sh ./

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/quagen quagen/

ENV PYTHONUNBUFFERED=0
ENV PYTHONPATH=.
CMD [ "python", "quagen/worker.py" ]

