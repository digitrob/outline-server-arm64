# Outline Server — ARM64

[![Build and Test](https://github.com/digitrob/outline-server-arm64/actions/workflows/build_and_test_debug.yml/badge.svg?branch=master)](https://github.com/digitrob/outline-server-arm64/actions/workflows/build_and_test_debug.yml)
[![Publish ARM64 Docker image](https://github.com/digitrob/outline-server-arm64/actions/workflows/publish-image.yml/badge.svg?branch=master)](https://github.com/digitrob/outline-server-arm64/actions/workflows/publish-image.yml)

An **ARM64 build of the [Outline Server](https://github.com/OutlineFoundation/outline-server)**, tracking upstream `master` and published as a container image on the GitHub Container Registry.

The official `quay.io/outline/shadowbox` image is published for `linux/amd64` only. This repository builds the same server natively for **`linux/arm64`** (Raspberry Pi, Ampere, Apple Silicon, ARM cloud instances, …).

## Components

| Component                                                               | Version                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------- |
| Node.js                                                                 | **26.13.0** (LTS "Lithium")                         |
| Go                                                                      | **1.27.3**                                          |
| [outline-ss-server](https://github.com/OutlineFoundation/tunnel-server) | **v1.9.2**                                          |
| [Prometheus](https://prometheus.io/)                                    | **3.15.1**                                          |
| Alpine Linux                                                            | 3.24 (via the `node:26.13.0-alpine3.24` base image) |

The server itself is the current upstream Outline Server (v1.12.x code line), so it includes the latest access-key management API, replay protection, IP-to-country/ASN metrics, and security fixes. The only fork-specific changes are the ARM64 build pipeline, the Node.js 26 engine upgrade, and a small CORS middleware replacement (see [Changes from upstream](#changes-from-upstream)).

## Installation

### On an ARM64 server

```sh
sudo SB_IMAGE="ghcr.io/digitrob/outline-server-arm64:latest" bash -c "$(wget -qO- https://raw.githubusercontent.com/digitrob/outline-server-arm64/master/src/server_manager/install_scripts/install_server.sh)"
```

Optional flags, e.g. a fixed hostname and key port:

```sh
sudo SB_IMAGE="ghcr.io/digitrob/outline-server-arm64:latest" bash -c "$(wget -qO- https://raw.githubusercontent.com/digitrob/outline-server-arm64/master/src/server_manager/install_scripts/install_server.sh)" install_server.sh \
  --hostname=myserver.example.com \
  --keys-port=443
```

> [!IMPORTANT]
> The GHCR package must be public for anonymous `docker pull` to work. After the first publish, open the package settings on GitHub and change its visibility to **Public**. If you prefer to keep it private, run `docker login ghcr.io` on the server first.

The install script is the current upstream script. It supports `x86_64`, `aarch64`, and `arm64`, and uses `nickfedor/watchtower` for automatic updates.

### Using the Outline Manager

Copy the `apiUrl`/`certSha256` line printed at the end of the installation into [Outline Manager](https://github.com/OutlineFoundation/outline-apps/) Step 2.

## Building from source

**Prerequisites**

- [Node.js](https://nodejs.org/) 26 LTS (`lts/lithium`)
- [Go](https://go.dev/dl/) 1.27+
- [Docker](https://docs.docker.com/engine/install/) (for the image build)

```sh
npm install
```

Build the server (Node.js bundle + `outline-ss-server` + Prometheus) for ARM64:

```sh
TARGET_ARCH=aarch64 ./task shadowbox:build
```

Build the container image:

```sh
TARGET_ARCH=aarch64 ./task shadowbox:docker:build \
  IMAGE_NAME=ghcr.io/digitrob/outline-server-arm64 \
  IMAGE_VERSION=dev
```

Run the server directly on the host (Linux or macOS):

```sh
./task shadowbox:start
```

Run the tests:

```sh
./task lint
./task shadowbox:test
```

The container image is built and published automatically by [`.github/workflows/publish-image.yml`](.github/workflows/publish-image.yml) on every push to `master`:

- `ghcr.io/digitrob/outline-server-arm64:YYYY-MM-DD`
- `ghcr.io/digitrob/outline-server-arm64:latest`

## Upgrading a running server

Because the image is built from the current upstream server, upgrading an existing 2022-era arm64 server (Outline Server 1.6.x) is an **in-place replacement** of the container image. Watchtower will pick up `:latest` automatically.

Before upgrading:

1. Back up the persistent state: `sudo cp -a /opt/outline /opt/outline.bak`
2. Pin the current image tag if you want an easy rollback:
   `docker inspect --format '{{index .Config.Labels "shadowbox.github.release"}}' shadowbox`
3. Note that **Prometheus 3 upgrades the TSDB in a one-way direction**. The new Prometheus can read the old data, but Prometheus 2 cannot read data written by Prometheus 3. Restoring the `/opt/outline/prometheus` backup is required to roll back.

The management API, access keys, certificates, and state directory layout are unchanged.

## Changes from upstream

- **ARM64 everywhere**: the build runs natively on ARM64 CI runners, and Prometheus + `outline-ss-server` are built/linked for `linux/arm64`.
- **Node.js 26 LTS** instead of the upstream Node 18 (EOL).
- **outline-ss-server v1.9.2**, **Prometheus 3.15.1**, **Go 1.27.3**.
- **Runtime dependencies upgraded**: `restify` 12, `restify-errors` 9, `prom-client` 15, `js-yaml` 5, `uuid` 11.
- **CORS middleware**: replaced the unmaintained `restify-cors-middleware2` (pinned to restify 11 and pulls in `spdy`, which no longer loads on Node.js 22+) with a small in-repo middleware that preserves the same behavior.
- **Node metrics listener** binds explicitly to `127.0.0.1` so Prometheus can scrape it on hosts where `localhost` resolves to IPv6 first.

## License

Apache 2.0. See [LICENSE](LICENSE). This is a fork of the Outline Server by The Outline Authors; upstream copyright and license notices are preserved.
