const puppeteer = require('puppeteer');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection!');

    // Launch a new Puppeteer instance for this user
    (async () => {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        ws.on('message', async (data) => {
            // Handle messages received from the WebSocket connection
            console.log(`Received message from user: ${data}`);

            // Perform actions on the website using Puppeteer
            await page.goto('https://google.com');
            // Perform actions on the website, such as clicking buttons or filling out forms

            // Send messages back to the user via the WebSocket connection
            ws.send('Hello, user! I am your autobot.');
        });

        ws.on('close', async () => {
            // Close the Puppeteer instance when the WebSocket connection is closed
            await browser.close();
            console.log('WebSocket connection closed.');
        });
    })();
});
