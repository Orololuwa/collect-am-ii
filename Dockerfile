# Use Debian-based Node image (better Chromium support than Alpine)
# Using Node 22 as some packages require it
#
# Layer order matters for rebuild speed: dependencies are installed from
# package.json + package-lock.json alone, so a code-only change reuses the
# cached `npm ci` layers and only re-runs the build.

# Puppeteer drives the system Chromium installed in the final image, so its
# own Chrome download is skipped everywhere.
FROM node:22-slim AS development-dependencies-env
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm ci

FROM node:22-slim AS production-dependencies-env
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package.json package-lock.json /app/
# Skip lifecycle scripts (like 'prepare' which runs husky) since devDependencies aren't installed
RUN npm ci --omit=dev --ignore-scripts

# Builds the app. Also used by the `migrate` service in docker-compose.yml,
# because it has the Prisma CLI.
FROM node:22-slim AS build-env
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
COPY . /app/
# Generate Prisma client before building (doesn't require database connection)
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
RUN npm run build

# Final production image
FROM node:22-slim

# Install Chromium and dependencies for Puppeteer (PDF generation)
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
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set NODE_ENV to production
ENV NODE_ENV=production
# Placeholder; docker-compose.yml sets the real DATABASE_URL at runtime.
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

WORKDIR /app
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
# Copy Prisma schema and migrations
COPY ./prisma /app/prisma
COPY ./prisma.config.ts /app/prisma.config.ts
# Copy generated Prisma client (needed at runtime)
COPY --from=build-env /app/app/generated /app/app/generated

# The app listens on PORT (react-router-serve).
ENV PORT=3001
EXPOSE 3001

# Migrations are applied by the `migrate` service in docker-compose.yml
# (the runtime image has no Prisma CLI), then the app starts.
CMD ["sh", "-c", "npm run start"]
