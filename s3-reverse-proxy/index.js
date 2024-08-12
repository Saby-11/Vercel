const express = require('express')
const httpProxy = require('http-proxy')

const app = express()
const PORT = 8000

const BASE_PATH = 'https://vercel-clone-saby.s3.eu-north-1.amazonaws.com/__outputs/'

const proxy = httpProxy.createProxy()

app.use((req, res) => {
    const hostname = req.hostname
    const subdomain = hostname.split('.')[0]

    const reslovesTo = `${BASE_PATH}/${subdomain}`

    return proxy.web(req, res, {target: reslovesTo, changeOrigin: true})
})

proxy.on('proxyReq', (proxyReq, req, res) => {
    const url = req.url;
    if(url === '/')
        proxyReq.path += 'index.html'
})

app.listen(PORT, () => console.log(`Reverse proxy running..${PORT}`))