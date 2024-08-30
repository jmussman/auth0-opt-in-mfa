# See here for image contents: https://github.com/devcontainers/images/blob/22ce794a06cb34e12674d6aaf5e4549f6ab8ee4e/src/javascript-node/.devcontainer/Dockerfile

# [Choice] Node.js version: 18, 20
# ARG VARIANT="latest"
ARG VARIANT="22.16.0"
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${VARIANT}

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

RUN curl -L -o /tmp/gh.deb https://github.com/cli/cli/releases/download/v2.53.0/gh_2.53.0_linux_amd64.deb
RUN apt install -y /tmp/gh.deb

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g --slient npm parcel-bundler concurrently eslint prettier"
