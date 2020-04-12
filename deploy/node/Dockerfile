FROM node:13.12.0-alpine3.11

RUN apk update \
    && apk add --no-cache \
    && apk add build-base \
    && apk add python \
    && rm -rf /var/cache/apk/*

WORKDIR /app
ARG QUAGEN_TESTING="no"

COPY package.json ./
COPY package-lock.json ./
COPY rollup.config.js ./
RUN npm install

COPY .eslintignore ./
COPY .eslintrc.json ./
COPY .prettierignore ./
COPY .prettierrc ./
COPY src src
COPY tests tests
RUN if [ "$QUAGEN_TESTING" = "no" ]; then rm -fr tests; fi

CMD [ "npm", "run", "autobuild" ]