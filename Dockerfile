# ---------- Stage 1: builder ----------
FROM node:20-slim AS builder

# set working dir
WORKDIR /build

# copy package manifest & install dependencies (optimised for caching)
COPY package*.json ./
RUN npm ci --production

# copy full source so that build artifacts (if any) are available
COPY . .

# ---------- Stage 2: runtime ----------
FROM node:20-slim AS runtime

ENV NODE_ENV=production
ENV TZ=UTC

# install system deps: cron and tzdata
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      cron tzdata ca-certificates && \
    # ensure timezone set to UTC non-interactively
    ln -fs /usr/share/zoneinfo/UTC /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    # cleanup apt caches
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# copy node modules and app from builder
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package*.json ./
COPY --from=builder /build ./

# Create data & cron dirs that should be mounted or persisted
RUN mkdir -p /data /cron && chown -R root:root /data /cron && chmod 755 /data /cron

# Ensure cron file from repo placed into /etc/cron.d/2fa
# (We also copy the cron file in the repo at /app/cron/2fa-cron)
RUN if [ -f /app/cron/2fa-cron ]; then \
      cp /app/cron/2fa-cron /etc/cron.d/2fa && chmod 0644 /etc/cron.d/2fa ; \
    fi

# Ensure crontab is loaded on container start (start.sh will ensure cron runs)
# Expose port used by your server
EXPOSE 8080

# Copy helper startup script and make executable
COPY ./start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Important: do NOT bake private keys into the image. Mount them at runtime.
VOLUME [ "/data", "/cron" ]

# Use a non-root user only if app supports it; for simplicity we run as root here.
CMD [ "/usr/local/bin/start.sh" ]
