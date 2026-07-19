# Stage 1: Build binary
FROM golang:1.20-alpine AS builder

WORKDIR /app

# Copy mod file
COPY go.mod ./

# Run tidy inside the container to download dependencies and generate go.sum automatically
RUN go mod tidy

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/api ./cmd/api

# Stage 2: Final minimal image
FROM alpine:3.18

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/api .

# Expose port
EXPOSE 8080

# Run API
CMD ["./api"]
