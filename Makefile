ZIP = `grep '"version"' manifest.json | sed 's/",/.zip/' | sed 's/.*"/archive\/happymeet-/'`

all: zip clean
	@echo "latest dist is in $(ZIP)"

zip: copy
	@if test -f $(ZIP); then (echo;echo "############# ERROR: First bump version in manifest.json ################";echo;) else (cd dist; zip -r -X ../$(ZIP) .); fi

copy: 
	@mkdir -p dist
	@mkdir -p dist/jquery
	@grep -v '"tabs"' < manifest.json > dist/manifest.json
	cp happymeet-logo.png happymeet.css dist
	@cp meet.js calendar.js slides.js happymeet.js background.js dist
	@cp jquery/*.min.* dist/jquery

clean: 
	@rm -rf dist
