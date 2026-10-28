# Use Debian-based Node image (better Chromium support than Alpine)
# Using Node 22 as some packages require it
FROM node:22-slim AS development-dependencies-env

# Install Chromium and dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY . /app
WORKDIR /app
RUN npm ci

FROM node:22-slim AS production-dependencies-env

# Install Chromium and dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY ./package.json package-lock.json /app/
WORKDIR /app
# Skip lifecycle scripts (like 'prepare' which runs husky) since devDependencies aren't installed
RUN npm ci --omit=dev --ignore-scripts

FROM node:22-slim AS build-env

# Install Chromium and dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
# Copy Prisma files needed for client generation
COPY ./prisma /app/prisma
COPY ./prisma.config.ts /app/prisma.config.ts
WORKDIR /app
# Generate Prisma client before building (doesn't require database connection)
# Accept DATABASE_URL as build arg from Railway (with dummy fallback)
# Railway will pass this from your environment variables if configured
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
RUN npm run build

# Final production image
FROM node:22-slim

# Install Chromium and dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set NODE_ENV to production
ENV NODE_ENV=production
# Provide a fallback DATABASE_URL (Railway will override this with the real value at runtime)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
# Copy Prisma schema and migrations for runtime migrations
COPY ./prisma /app/prisma
COPY ./prisma.config.ts /app/prisma.config.ts
# Copy generated Prisma client (needed at runtime)
COPY --from=build-env /app/app/generated /app/app/generated
WORKDIR /app

# The app listens on PORT (react-router-serve). Railway overrides it.
ENV PORT=3001
EXPOSE 3001

# Migrations are applied by the `migrate` service in docker-compose.yml
# (the runtime image has no Prisma CLI), then the app starts.
CMD ["sh", "-c", "npm run start"]
