min: 
	mkdir -p build
	minify --js < meet.js > build/meet.js
	minify --js < calendar.js > build/calendar.js
	minify --js < slides.js > build/slides.js
	minify --js < happymeet.js > build/happymeet.js
	minify --js < background.js > build/background.js
	minify --css < happymeet.css > build/happymeet.css

clean: 
	rm -rf build

build: min
	cp *.js manifest.json person-logo.png build
	mkdir -p build/jquery
	cp jquery/*.min.* build/jquery
	(cd build && zip -r -X "../happymeet-1.0.zip" .)