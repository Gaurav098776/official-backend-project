FROM --platform=linux/amd64 ubuntu:20.04

RUN apt-get update && apt-get install -y curl

RUN apt-get update \
    && apt-get install -y fonts-indic \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sL https://deb.nodesource.com/setup_18.x | bash - \
            && apt-get install -y nodejs

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

ENV TZ=Asia/Kolkata

# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN apt-get update && apt-get install curl gnupg -y \
  && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install google-chrome-stable -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

RUN npm i -g @nestjs/cli@9.0.0

WORKDIR /app

RUN mkdir -p /app/credentials

RUN mkdir -p /app/logs

RUN mkdir -p /app/upload/report

COPY package.json .

RUN npm install --force

COPY . .

RUN npm run build

CMD ["npm","run","start:prod"]
