/**
 * ⚡⚡⚡ DECLARAMOS LAS LIBRERIAS y CONSTANTES A USAR! ⚡⚡⚡
 */



require('dotenv').config()
    //const fs = require('fs');
const express = require('express');
const cors = require('cors')
const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const { middlewareClient } = require('./middleware/client')
const { generateImage, cleanNumber } = require('./controllers/handle')
const { connectionReady } = require('./controllers/connection')
    //const { saveMedia } = require('./controllers/save')
const { getMessages, responseMessages } = require('./controllers/flows')
const { sendMedia, sendMessage, lastTrigger, sendMessageButton, readChat } = require('./controllers/send')
const app = express();
app.use(cors())
app.use(express.json())


const server = require('http').Server(app)
const io = require('socket.io')(server, {
    cors: {
        origins: ['http://localhost:4200']
    }
})

let socketEvents = { sendQR: () => {}, sendStatus: () => {} };

io.on('connection', (socket) => {
    const CHANNEL = 'main-channel';
    socket.join(CHANNEL);
    socketEvents = require('./controllers/socket')(socket)
    console.log('Se conecto')
})

app.use('/', require('./routes/web'))

const port = process.env.PORT || 3000

var client;

/**
 * Escuchamos cuando entre un mensaje
 */
const listenMessage = () => client.on('message', async msg => {
    const { from, body, hasMedia } = msg;
    // Este bug lo reporto Lucas Aldeco Brescia para evitar que se publiquen estados
    if (from === 'status@broadcast') {
        return
    }
    message = body.toLowerCase();
    console.log('BODY', message)
    const number = cleanNumber(from)
    await readChat(number, message)

    /**
     * Guardamos el archivo multimedia que envia
     */
    // if (process.env.SAVE_MEDIA && hasMedia) {
    //     const media = await msg.downloadMedia();
    //     saveMedia(media);
    // }


    /**
     * Ver si viene de un paso anterior
     * Aqui podemos ir agregando más pasos
     * a tu gusto!
     */

    const lastStep = await lastTrigger(from) || null;
    console.log({ lastStep })
    if (lastStep) {
        const response = await responseMessages(lastStep)
        await sendMessage(client, from, response.replyMessage);
    }

    /**
     * Respondemos al primero paso si encuentra palabras clave
     */
    const step = await getMessages(message);
    console.log({ step })

    if (step) {
        const response = await responseMessages(step);

        /**
         * Si quieres enviar botones
         */

        await sendMessage(client, from, response.replyMessage, response.trigger);
        if (response.hasOwnProperty('actions')) {
            const { actions } = response;
            await sendMessageButton(client, from, null, actions);
            return
        }

        if (!response.delay && response.media) {
            sendMedia(client, from, response.media);
        }
        if (response.delay && response.media) {
            setTimeout(() => {
                sendMedia(client, from, response.media);
            }, response.delay)
        }
        return
    }

    //Si quieres tener un mensaje por defecto
    if (process.env.DEFAULT_MESSAGE === 'true') {
        const response = await responseMessages('DEFAULT')
        await sendMessage(client, from, response.replyMessage, response.trigger);

        /**
         * Si quieres enviar botones
         */
        if (response.hasOwnProperty('actions')) {
            const { actions } = response;
            await sendMessageButton(client, from, null, actions);
        }
        return
    }
});

/**
 * Generamos un QRCODE para iniciar sesion
 */

client = new Client();

client.on('qr', qr => generateImage(qr, () => {
    qrcode.generate(qr, { small: true });
    console.log(`Ver QR http://localhost:${port}/qr`)
    socketEvents.sendQR(qr)
}))

client.on('ready', (a) => {
    connectionReady()
    listenMessage()
    loadRoutes(client);
    socketEvents.sendStatus(client)
});

client.initialize();

/**
 * Cargamos rutas de express
 */

const loadRoutes = (client) => {
    app.use('/api/', middlewareClient(client), require('./routes/api'))
}


server.listen(port, () => {
    console.log(`El server esta listo por el puerto ${port}`);
})