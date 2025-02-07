FROM mirror.gcr.io/tsl0922/ttyd:alpine as ttyd

FROM mirror.gcr.io/golang:alpine AS terminal
WORKDIR /app
COPY packages/go/. .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o terminal ./cmd/cli/main.go

FROM mirror.gcr.io/oven/bun:1.1.40
WORKDIR /app
RUN mkdir packages
COPY package.json ./
COPY packages/*/package.json ./packages/
COPY packages ./packages
RUN bun install

COPY packages/vhs/src/GeistMonoVF.ttf /usr/share/fonts/GeistMonoVF.ttf
ENV VHS_NO_SANDBOX="true"
COPY --from=ttyd /usr/bin/ttyd /usr/bin/ttyd
RUN apt update && apt -y install curl gpg
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://repo.charm.sh/apt/gpg.key | gpg --dearmor -o /etc/apt/keyrings/charm.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] https://repo.charm.sh/apt/ * *" | tee /etc/apt/sources.list.d/charm.list
RUN apt update && apt -y install vhs ffmpeg chromium

WORKDIR /app/packages/vhs
COPY --from=terminal /app/terminal /usr/bin/terminal
CMD bun run ./src/index.ts
EXPOSE 3001
