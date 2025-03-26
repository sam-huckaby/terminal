FROM mirror.gcr.io/golang:alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o ssh ./cmd/ssh/main.go

# Second stage: build the runtime image.
FROM mirror.gcr.io/alpine:3.21.2
WORKDIR /root/
ENV FOO=1
RUN apk add --no-cache ncurses
COPY xterm-ghostty.terminfo /tmp/xterm-ghostty.terminfo
RUN tic -x /tmp/xterm-ghostty.terminfo && rm /tmp/xterm-ghostty.terminfo
COPY --from=builder /app/ssh .
CMD ./ssh
