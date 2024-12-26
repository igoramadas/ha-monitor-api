// HA-MONITOR-API

require("dotenv").config()

const express = require("express")
const fs = require("fs")
const http = require("http")
const si = require("systeminformation")
const app = express()

process.on("uncaughtException", (ex) => {
    console.error(ex)
})
process.on("unhandledRejection", (ex) => {
    console.error(ex)
})

const parseBool = (value) => (value ? ["true", "yes", "1"].includes(value.toLowerCase()) : false)

// Program variables.
const PORT = process.env.HAMONITOR_PORT || 9999
const TOKEN = process.env.HAMONITOR_TOKEN || null
const LOGLEVEL = process.env.HAMONITOR_LOGLEVEL || "info"
const BRIEF = parseBool(process.env.HAMONITOR_BRIEF)
const ROUND = parseBool(process.env.HAMONITOR_ROUND)
const UNITS = parseBool(process.env.HAMONITOR_UNITS)

// Helpers to round (or not) and add units based on the program settings.
const round = (value) => (!ROUND ? value || 0 : value ? Math.round((value + Number.EPSILON) * 100) / 100 : 0)
const roundSuffix = (value, suffix) => {
    if (ROUND) value = round(value)
    return UNITS ? `${value}${suffix}` : value
}
const roundSize = (value, perSecond) => {
    let unit = "b"
    if (UNITS) {
        let sizeUnits = ["kb", "mb", "gb", "tb"]
        while (value > 1024 && sizeUnits.length > 1) {
            value /= 1024
            unit = sizeUnits.shift()
        }
    }
    return roundSuffix(value, unit)
}

// Health check endpoint.
app.get("/healthcheck", (req, res) => {
    res.json(true)
})

// Default endpoint which returns the system metrics.
app.get("/", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress
    const result = {cpu: {}, memory: {}}

    // Check for bearer auth token, if set.
    if (TOKEN) {
        const authHeader = req.headers.authorization
        if (!authHeader || authHeader.substring(7) != TOKEN) {
            if (LOGLEVEL != "none") {
                console.error(`Unauthorized access to ha-monitor-api, invalid token, from ${clientIp}`)
            }
            res.status(401).json({error: "Unauthorized"})
            return
        }
    }

    // Get CPU temperature.
    try {
        result.cpu.temperature = null

        const cpuTemperature = await si.cpuTemperature()
        result.cpu.temperature = roundSuffix(cpuTemperature.main, "°")
    } catch (ex) {
        if (LOGLEVEL) {
            console.error(ex)
        }
    }

    // Get CPU, memory and drive stats.
    try {
        result.cpu.loadCurrent = null
        result.cpu.loadAverage = null

        const currentLoad = await si.currentLoad()
        result.cpu.loadCurrent = roundSuffix(currentLoad.currentLoad, "%")
        result.cpu.loadAverage = round(currentLoad.avgLoad)
    } catch (ex) {
        if (LOGLEVEL) {
            console.error(ex)
        }
    }

    // Get memory stats.
    try {
        result.memory.total = null
        result.memory.free = null
        result.memory.used = null
        result.memory.usage = null

        const mem = await si.mem()
        result.memory.total = roundSize(mem.total)
        result.memory.free = roundSize(mem.free)
        result.memory.used = roundSize(mem.active)
        result.memory.cached = roundSize(mem.buffcache)
        result.memory.usage = roundSuffix((mem.active / mem.total) * 100, "%")
    } catch (ex) {
        if (LOGLEVEL) {
            console.error(ex)
        }
    }

    // Get file system details.
    try {
        result.fs = null

        const fsSize = await si.fsSize()
        const commonMounts = ["/system/volumes/data", "c:/", "/"]
        const filter = (f) => {
            return f ? {mount: f.mount, size: roundSize(f.size), usage: roundSuffix(f.use, "%")} : null
        }
        if (BRIEF) {
            result.fs = filter(fsSize.find((f) => commonMounts.includes(f.mount?.toLowerCase()) || fsSize[0]))
        } else {
            result.fs = fsSize.map(filter)
        }
    } catch (ex) {
        if (LOGLEVEL) {
            console.error(ex)
        }
    }

    // Get file system stats.
    try {
        result.fsStats = null

        const disksIO = await si.disksIO()
        const fsStats = await si.fsStats()
        result.fsStats = {rearPerSec: roundSize(fsStats.rx_sec, true), writePerSec: roundSize(fsStats.wx_sec, true), ioReadPerSec: roundSize(disksIO.rIO_sec, true), ioWritePerSec: roundSize(disksIO.wIO_sec, true)}
    } catch (ex) {
        if (LOGLEVEL) {
            console.error(ex)
        }
    }

    // Get network stats.
    try {
        result.network = null

        const networkInterfaceDefault = await si.networkInterfaceDefault()
        const networkStats = await si.networkStats()
        const filter = (n) => {
            return n ? {interface: n.iface, state: n.operstate, receivePerSec: roundSize(n.rx_sec, true), sendPerSec: roundSize(n.tx_sec, true)} : null
        }
        if (BRIEF) {
            result.network = filter(networkStats.find(async (n) => n.iface == networkInterfaceDefault || n.operstate == "up") || networkStats[0])
        } else {
            result.network = networkStats.map(filter)
        }
    } catch (ex) {
        if (LOGLEVEL) {
            console.error(ex)
        }
    }

    // Get wireless network stats.
    try {
        result.wifi = null

        const wifiConnections = await si.wifiConnections()
        const filter = (w) => {
            return w ? {ssid: w.ssid, signal: w.signalLevel ? roundSuffix(w.signalLevel, "dB") : roundSuffix(w.quality, "%")} : null
        }
        if (BRIEF) {
            result.wifi = filter(wifiConnections.find((w) => w.txRate) || wifiConnections[0])
        } else {
            result.wifi = wifiConnections.map(filter)
        }
    } catch (ex) {
        if (LOGLEVEL) {
            console.error(ex)
        }
    }

    if (LOGLEVEL == "info") {
        console.log(`Access to ha-monitor-api from ${clientIp} | CPU: ${result.cpu.loadCurrent}%, ${result.cpu.temperature}° | Memory ${result.memory.usage}%`)
    }

    // Send results to client.
    res.json(result)
})

// We need to do an initial call to stats to have the proper data afterwards.
si.disksIO()
si.fsStats()
si.networkStats()
si.wifiConnections()

// Start the HTTP server.
http.createServer(app).listen(PORT)
if (LOGLEVEL == "info") {
    console.log(`Starting ha-monitor-api on port ${PORT}`)
}
