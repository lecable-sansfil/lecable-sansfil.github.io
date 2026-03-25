# Default Shell to use
SHELL := /bin/bash

# Absolute path of the directory of this script
root_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

.PHONY: build serve

help:
	@echo "Makefile commands:"
	@echo "  serve    - Serve the Jekyll site using Docker"

serve:
	docker run --rm \
	  --env GEM_HOME=/srv/jekyll/.jekyll-cache/gemfiles \
	  --publish 4000:4000 \
	  --volume="$(root_dir):/srv/jekyll:Z" \
	  jekyll/jekyll \
	  sh -c "npm install && jekyll serve --trace"
