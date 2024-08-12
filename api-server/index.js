const express = require('express')
const {generateSlug} = require('random-word-slugs')
const {ECSClient, RunTaskCommand} = require('@aws-sdk/client-ecs')
const {Server} = require('socket.io')
const Redis = require('ioredis')

const app = express()
const PORT = 9000

const subscriber = new Redis('rediss://default:AVNS_Q47oxCVLZ-JVMRFd-bB@caching-35b83984-redis-vercel.h.aivencloud.com:10332')

const io = new Server({cors: '*'})

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel)
        socket.emit('message', `Joined ${channel}`)
    })
})

io.listen(9001, () => {
    console.log('Socket server started on 9001')
})

const ecsClient = new ECSClient({
    region: 'eu-north-1',
    credentials: {
        accessKeyId:'AKIA45Y2R3AM7OYRK3D6',
        secretAccessKey:'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'
    }
})

const config = {
    CLUSTER: 'arn:aws:ecs:eu-north-1:888577054745:cluster/builder-cluster2',
    TASK: 'arn:aws:ecs:eu-north-1:888577054745:task-definition/builder-task'
}

app.use(express.json())

app.post('/project', async (req, res) => {
    const {gitURL} = req.body
    const projectSlug = generateSlug()

    // spin the container
    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        launchType: 'FARGATE',
        count:1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp:'ENABLED',
                subnets:['subnet-0b4f09da6ef54a07a', 'subnet-062ad6aa0a9124f2f', 'subnet-0cb5a628e93887205'],
                securityGroups:['sg-023985822c9e9f0fd']
            }
        },
        overrides:{
            containerOverrides: [
                {
                    name: 'builder-image',
                    environment: [
                        {name: 'GIT_REPOSITORY__URL', value: gitURL},
                        {name: 'PROJECT_ID', value: projectSlug}
                    ]
                }
            ]
        }
    })

    await ecsClient.send(command);

    return res.json({status: 'queued', data: {projectSlug, url: `http://${projectSlug}.localhost:8000`}})
})


async function initRedisSubscriber() {
    console.log('Subscribed to logs')
    subscriber.psubscribe('logs:*')
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message)
    })
}

initRedisSubscriber()

app.listen(PORT, () => console.log(`API Server running..${PORT}`))