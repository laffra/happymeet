VERSION = `grep '"version"' ../manifest.json | sed 's/",//' | sed 's/.*"//'`

copy: 
	mkdir -p build
	cp meet.js build/meet.js
	cp calendar.js build/calendar.js
	cp slides.js build/slides.js
	cp happymeet.js build/happymeet.js
	cp background.js build/background.js
	cp happymeet.css build/happymeet.css

clean: 
	rm -rf build

build: copy
	cp manifest.json happymeet-logo.png build
	mkdir -p build/jquery
	cp jquery/*.min.* build/jquery
	(cd build; zip -r -X ../archive/happymeet-$(VERSION).zip .)


