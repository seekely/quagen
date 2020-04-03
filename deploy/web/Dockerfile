FROM python:3.8-alpine3.11

RUN apk update \
    && apk add --no-cache \
    && apk add build-base \
    && apk add postgresql-client \
    && apk add postgresql-dev \
    && rm -rf /var/cache/apk/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/quagen quagen/

ENV FLASK_APP=quagen
ENV FLASK_ENV=development
ENV FLASK_RUN_HOST 0.0.0.0
CMD [ "flask", "run" ]

