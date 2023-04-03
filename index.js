const puppeteer = require('puppeteer');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection!');

    // Launch a new Puppeteer instance for this user
    (async () => {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();

        ws.on('message', async (data) => {
            // Handle messages received from the WebSocket connection
            data = JSON.parse(data);
            console.log(`Received message from user: ${data.type}`);

            // Perform actions on the website using Puppeteer
            const gotoGame = async () => {
                await page.goto('http://agency1-lower.cicanopro.com/');

                await delay(1);

                // Set screen size
                await page.setViewport({ width: 1080, height: 1024 });
                ws.send('Hello, user! I am your autobot.');

                // Interacting with Login Form
                await page.waitForSelector('#strID');
                await delay(3);
                await page.type('#strID', 'test001');
                await page.type('#strPW', 'asdf1234!');
                await delay(2);
                await page.click('#txtInput');

                ws.send('Hello, user! I am your autobot.');
                await page.evaluate(() => {
                    let reCaptcha = document.getElementById('mainCaptcha');
                    let reCaptchaInput = document.getElementById('txtInput');
                    reCaptchaInput.value = reCaptcha.value;
                });

                await delay(3);
                await page.click('.white-btn')
                await delay(3);
                await page.goto('https://agency1-lower.cicanopro.com/playTotalApi?strGameID=center_evo');
                await delay(5);
                await page.goto('https://babylonvgpops.evo-games.com/frontend/evo/r2/#category=baccarat_sicbo');
                await delay(5);

                ws.send('Hello, user! I am your autobot.');

                page.waitForSelector('[data-role="multiplay-button"]');
                await delay(3);
                page.click('[data-role="multiplay-button"]');

                await delay(5);
                const iframe = await page.waitForSelector('iframe');
                console.log(iframe);

                await page.evaluate(() => {
                    let iframe = document.getElementsByTagName('iframe');
                    window.location.replace(iframe[1].src);
                })
                ws.send('Hello, user! I am your autobot.');
                // await page.goto(iframeUrl);
                await delay(5);

                // Waiting for Sockets to be opened
                await page.waitForFunction(() => {
                    console.log(WebSocket.length);
                    return window.WebSocket && WebSocket.length > 0 && WebSocket.OPEN;
                });

                ws.send('Hello, user! I am your autobot.');
                await delay(10);
                ws.send('Hello, user! I am your autobot.');
            }

            const betGame = async (data) => {
                console.log(data);

            }


            if (data.type == "login") {
                gotoGame();
            }

            if (data.type == "betting") {
                betGame(data);
            }

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


// Synchronyse Sleep function
function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time * 1000)
    });
}
