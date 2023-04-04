const puppeteer = require('puppeteer');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection!');

    // Launch a new Puppeteer instance for this user
    (async () => {
        const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
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
                // ws.send('Hello, user! I am your autobot.');

                // Interacting with Login Form
                await page.waitForSelector('#strID');
                await delay(3);
                await page.type('#strID', 'testqa01');
                await page.type('#strPW', 'asdf1234!');
                await delay(2);
                await page.click('#txtInput');

                // ws.send('Hello, user! I am your autobot.');
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

                ws.send('Successfully logged in');

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
                ws.send('Openning betting tables');
                // await page.goto(iframeUrl);
                await delay(5);

                // Waiting for Sockets to be opened
                await page.waitForFunction(() => {
                    console.log(WebSocket.length);
                    return window.WebSocket && WebSocket.length > 0 && WebSocket.OPEN;
                });

                ws.send('Ready to bet');
                await delay(10);
                ws.send('Waiting for bettings');
            }

            const betGame = async (message) => {

                let bettingRecieved = false;
                let bettingTables = [];
                let betsJson = message;
                console.log(message);
                message.forEach(element => {
                    if (!bettingTables.includes(element.table))
                        bettingTables.push(element.table);
                });

                bettingRecieved = true;


                var tableIdList = [];

                const client = await page.target().createCDPSession();
                await client.send('Network.enable');
                client.on('Network.webSocketFrameReceived', async event => {
                    const { requestId, timestamp, response } = event;

                    if ((response.payloadData).includes("baccarat")) {

                        let packet = JSON.parse(response.payloadData);
                        if (!tableIdList.includes(packet.args.tableId)) {
                            tableIdList.push(packet.args.tableId)
                        }

                        if (packet.type == "baccarat.gameState") {

                            // Betting for User sent table

                            async function executeConcurrently() {
                                let bettingDone = false;
                                const promises = betsJson.map(obj => {
                                    return new Promise(async (resolve, reject) => {
                                        // Execute set of codes on the object

                                        if (bettingTables.includes(packet.args.tableId) && packet.args.tableId == obj.table) {

                                            if (packet.args.betting == "BetsOpen") {

                                                console.log("[Game " + (packet.args.tableId) + "] Betting Opens now\n");
                                                let table = await page.waitForSelector(`[data-tableid="${obj.table}"]`);

                                                await table.waitForSelector('[data-role="timer"]');

                                                await delay(10);

                                                if (!bettingDone) {

                                                    await page.evaluate((tableId, chipValue, bet) => {

                                                        // console.log(tableId);
                                                        let table = document.querySelector(`[data-tableid="${tableId}"]`);
                                                        let player = table.querySelector('[data-role="bet-spot-Player"]');
                                                        let banker = table.querySelector('[data-role="bet-spot-Banker"]');
                                                        let tie = table.querySelector('[data-role="bet-spot-Tie"]');

                                                        let betAmount = document.querySelector('[data-role="selected-chip"]');
                                                        let chip = betAmount.querySelector('[data-role="chip"]');
                                                        chip.setAttribute('data-value', chipValue);


                                                        switch (bet) {
                                                            case "Player":
                                                                // player.click();
                                                                console.log(`*********** \nBetting ${chipValue} for ${bet} in Table ${tableId}  \n***********`);
                                                                break;
                                                            case "Banker":
                                                                // banker.click();
                                                                console.log(`*********** \nBetting ${chipValue} for ${bet} in Table ${tableId}  \n***********`);
                                                                break;
                                                            case "Tie":
                                                                // tie.click();
                                                                console.log(`*********** \nBetting ${chipValue} for ${bet} in Table ${tableId}  \n***********`);
                                                                break;
                                                            default:
                                                                break;
                                                        }
                                                    }, obj.table, obj.betAmount, obj.betFor);

                                                    console.log("[Game " + (obj.table) + "] Closing Betting...");
                                                    bettingDone = true;
                                                }

                                                setTimeout(() => {
                                                    console.log("[Game " + (obj.table) + "] Revealing Cards...");
                                                }, 14 * 1000);
                                            }


                                            if (packet.args.dealing == "Finished") {
                                                let playerHand = "Player Cards : " + packet.args.gameData.playerHand.cards + " | Scores : " + packet.args.gameData.playerHand.score;
                                                let bankerHand = "Banker Cards : " + packet.args.gameData.bankerHand.cards + " | Scores : " + packet.args.gameData.bankerHand.score;
                                                let winner = "Winner : " + packet.args.gameData.result.winner;

                                                if (bettingRecieved & bettingDone) {
                                                    switch (packet.args.gameData.result.winner) {
                                                        case obj.betFor:
                                                            console.log(`\nWINNER...! \nYou WON ${obj.betAmount} in Table ${obj.table} by betting for ${obj.betFor}`);
                                                            break;
                                                        case "Tie":
                                                            console.log("\nNo winners... Game was a TIE! [ Bet Refunded ]");
                                                            break
                                                        default:
                                                            console.log(`\nLOST...! \nYou LOST ${obj.betAmount} in Table ${obj.table} by betting for ${obj.betFor}`);
                                                            break;
                                                    }
                                                }
                                                console.log("\n[Game " + (obj.table) + "] \n" + playerHand + "\n" + bankerHand + "\n" + winner + "\n");
                                            }
                                        }

                                        // Resolve the promise when done
                                        resolve();
                                    });
                                });
                                await Promise.all(promises);

                                // if (packet.args.tableId == bettingTable) {
                            }
                            if (bettingRecieved) {
                                executeConcurrently();
                                // bettingRecieved = false;
                            }
                        }
                        // console.log("\n\n Sniffing " + tableIdList.length + " Games");
                    }

                });


            }


            if (data.type == "login") {
                gotoGame();
            }

            if (data.type == "betting") {
                betGame(data.bettings);
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
