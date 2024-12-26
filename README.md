# Home Assistant - Monitoring API

## WORK IN PROGRESS

Welcome to a more modern version of the lightweight "ha-monitor-api" project, forked from https://github.com/ned-kelly/ha-monitor-api.

This is a quick-and-dirty lightweight tool that exposes a JSON API with the system's current metrics such as CPU temperature and usage, memory, disk and network stats. Those metrics can be consumed by Home Assistant via REST sensors.

It's compatible with most Linux distros, Raspberry Pi and similar SBCs. In theory it should also work on Mac OS and Windows, but that hasn't been fully tested.

---

## Settings

The service is fully configured via environment variables prefixed with `HAMONITOR_`.

| Environment Variable | Default Value | Description                                                                                                                           |
| -------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `HAMONITOR_PORT`     | 9999          | Port on which the API will listen                                                                                                     |
| `HAMONITOR_TOKEN`    | null          | Optional bearer token for authorization                                                                                               |
| `HAMONITOR_LOGLEVEL` | "info"        | Log level (none, error, info), set to "error" if you want the service to log errors only, or "none" to disable logs completely        |
| `HAMONITOR_BRIEF`    | false         | Return only the main file system and main network stats as a single object, instead of listing all the available objects as an array  |
| `HAMONITOR_ROUND`    | false         | Round values to a maximum of 1 decimal places                                                                                         |
| `HAMONITOR_UNITS`    | false         | Add units to the values and and humanize file sizes (b, kb, mb, gb and tb), this will also change the affected field's type to string |

If you prefer to have these settings on a file, you can create a `.env` file on the application root with the environment variables set, for example:

```
HAMONITOR_BRIEF="true"
HAMONITOR_ROUND="true"
```

## Running with Node

![Version](https://img.shields.io/npm/v/ha-monitor-api.svg)

That's the easiest way, and it should work in older SBCs that are now powerful enough to run Docker. You will need to have [Node.js](https://nodejs.org/en/download/package-manager) (18+) installed thou, preferably with [pm2](https://pm2.keymetrics.io/) to keep the service running in the background.

For example, to install it on the `/var/ha-monitor-api` directory on a Raspberry Pi:

```bash
$ sudo apt install nodejs npm
$ sudo npm install pm2 -g
$ cd /var
$ sudo mkdir ha-monitor-api && cd ha-monitor-api
$ sudo apt update
$ sudo npm install ha-monitor-api
```

If you prefer, you can also clone the full GIT repo:

```bash
$ sudo apt install git nodejs npm
$ sudo npm install pm2 -g
$ cd /var
$ git clone git@github.com:igoramadas/ha-monitor-api.git
$ cd ha-monitor-api
$ npm install
```

Then to run, simply start with with pm2:

```bash
$ pm2 start index.js
```

If you are using an alternative package manager and want to run it directly, simply call:

```bash
$ npm start
```

## Running with Docker

![License](https://img.shields.io/github/license/igoramadas/ha-monitor-api.svg) ![Docker](https://img.shields.io/docker/pulls/igoramadas/ha-monitor-api.png)

The following system architectures are currently supported: `arm64`, `amd64`.

The easiest way to run it with Docker is by using the sample `docker-compose.yaml`. Simply download it to your directory of choice, make the desired changes (ie. settings via environment variables) and then execute:

```bash
$ curl https://raw.githubusercontent.com/igoramadas/ha-monitor-api/refs/heads/master/docker-compose.yaml
$ docker-compose up -d
```

## Integrating to Home Assistant

Getting the data into Home Assistant can be done via [RESTful sensors](https://www.home-assistant.io/integrations/sensor.rest).

```yaml
rest:
    resource: http://192.168.0.123:9999
    scan_interval: 60
    timeout: 10
    headers:
        Authorization: !secret my_sensor_secret_token
        Content-Type: application/json
        User-Agent: Home Assistant
    sensor:
        - name: Pi CPU Temperature
          value_template: "{{ value_json['cpu']['temperature'] }}"
        - name: Pi CPU Load Current
          value_template: "{{ value_json['cpu']['loadCurrent'] }}"
        - name: Pi CPU Load Average
          value_template: "{{ value_json['cpu']['loadAverage'] }}"
```

## Sample JSON responses

```json

```
