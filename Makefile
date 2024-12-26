# HA-MONITOR-API

# Clean resources.
clean:
	rm -rf ./node_modules
	rm -f package-lock.json

# Update dependencies.
update:
	-ncu -u
	npm install --prefer-online
