const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const client = new Client();

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', message => {
    console.log(message.body);
    if (message.body === 'test') {
        client.sendMessage(message.from, 'https://cdn.shopify.com/s/files/1/1061/1924/products/Flushed_Emoji_Icon_5e6ce936-4add-472b-96ba-9082998adcf7.png?v=1485573448');
    }
    if (message.body === 'hola') {
        client.sendMessage(message.from, 'https://Instagram.com/doc.maltes');
    }
});




client.initialize();
