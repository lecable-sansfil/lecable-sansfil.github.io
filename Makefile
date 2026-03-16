# Default Shell to use
SHELL := /bin/bash

# Absolute path of the directory of this script
root_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

.PHONY: build serve

help:
	@echo "Makefile commands:"
	@echo "  build       - Build the minified CSS and JS files using Docker"
	@echo "  serve       - Serve the Jekyll site using Docker"

build:
	docker run --rm \
	  --env GEM_HOME=/srv/jekyll/.jekyll-cache/gemfiles \
	  --volume="$(root_dir):/srv/jekyll:Z" \
	  jekyll/jekyll \
	  npm init -y && \
	  npm install --save-dev javascript-obfuscator cssnano-cli && \
	  npm run build:min

serve:
	docker run --rm \
	  --env GEM_HOME=/srv/jekyll/.jekyll-cache/gemfiles \
	  --publish 4000:4000 \
	  --volume="$(root_dir):/srv/jekyll:Z" \
	  jekyll/jekyll \
	  jekyll serve --trace
