FROM rust:1.90-slim AS builder
WORKDIR /app
COPY dashboard/Cargo.toml dashboard/Cargo.lock ./
COPY dashboard/src ./src
RUN cargo build --release --locked --bin hedgetracker

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/hedgetracker /usr/local/bin/hedgetracker
WORKDIR /app
COPY dashboard/data ./data
ENV PORT=8080
EXPOSE 8080
CMD ["hedgetracker"]
