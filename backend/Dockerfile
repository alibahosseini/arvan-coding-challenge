FROM golang:1.27-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY main.go ./

RUN CGO_ENABLED=0 go build -o challenge-api .

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/challenge-api ./challenge-api

EXPOSE 8080

CMD ["./challenge-api"]
