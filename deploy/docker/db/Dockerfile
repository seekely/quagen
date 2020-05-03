FROM postgres:12.1-alpine

WORKDIR /app

COPY src/quagen/sql quagen/sql
COPY deploy/docker/db/init_db.sh /docker-entrypoint-initdb.d/

ENV POSTGRES_DB=quagen
ENV POSTGRES_USER=quagen
ENV POSTGRES_PASSWORD=quagen
