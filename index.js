const puppeteer = require('puppeteer');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection!');
    let reloaded = false;

    // Launch a new Puppeteer instance for this user
    (async () => {
        const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
        const page = await browser.newPage();

        ws.on('message', async (data) => {
            // Handle messages received from the WebSocket connection
            data = JSON.parse(data);
            console.log(`Received message from user: ${data.type}`);

            // Perform actions on the website using Puppeteer
            const gotoGame = async (login) => {
                await page.goto('http://agency1-lower.cicanopro.com/');

                await delay(1);

                // Set screen size
                await page.setViewport({ width: 1080, height: 1024 });
                // ws.send('Hello, user! I am your autobot.');

                // Interacting with Login Form
                await page.waitForSelector('#strID');
                await delay(3);
                await page.type('#strID', login.uname);
                await page.type('#strPW', login.passwd);
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

                ws.send(JSON.stringify({ "msg": 'Successfully logged in' }));

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
                ws.send(JSON.stringify({ "msg": 'Openning betting tables' }));
                // await page.goto(iframeUrl);
                await delay(5);

                // Waiting for Sockets to be opened
                await page.waitForFunction(() => {
                    console.log(WebSocket.length);
                    return window.WebSocket && WebSocket.length > 0 && WebSocket.OPEN;
                });

                ws.send(JSON.stringify({ "msg": 'Ready to bet' }));
                await delay(10);

                ws.send(JSON.stringify({ "msg": 'Waiting for bettings' }));
            }

            const betGame = async (message) => {

                let bettingRecieved = false;
                let bettingTables = [];
                let balance = -1;
                let betsJson = message;
                let bettingDone = false;

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
                    if (!reloaded) {
                        await page.reload();
                        reloaded = true;
                    }
                    if ((response.payloadData).includes("baccarat")) {

                        let packet = JSON.parse(response.payloadData);
                        if (!tableIdList.includes(packet.args.tableId)) {
                            tableIdList.push(packet.args.tableId)
                        }

                        if (packet.type == "baccarat.gameState") {

                            // Betting for User sent table

                            async function executeConcurrently() {
                                const promises = betsJson.map(obj => {
                                    return new Promise(async (resolve, reject) => {
                                        // Execute set of codes on the object
                                        let coinList = ["1000", "5000", "25000", "50000", "100000", "500000"];
                                        // console.log(obj);
                                        if (bettingTables.includes(packet.args.tableId) && packet.args.tableId == obj.table) {

                                            if (packet.args.betting == "BetsOpen") {


                                                console.log("[Game " + (packet.args.tableId) + "] Betting Opens now\n");
                                                let iframeHandle = await page.waitForSelector('iframe');
                                                const iframe = await iframeHandle.contentFrame();
                                                let table = await iframe.waitForSelector(`[data-tableid="${obj.table}"]`);

                                                await table.waitForSelector('[data-role="timer"]');

                                                await delay(10);

                                                if (!bettingDone) {

                                                    await page.evaluate((tableId, chipValue, bet) => {

                                                        console.log(tableId, bet);
                                                        let iframe = document.querySelector('iframe');
                                                        let innerDocument = iframe.contentDocument;
                                                        let table = innerDocument.querySelector(`[data-tableid="${tableId}"]`);
                                                        // let table = innerDocument.querySelector(`[data-tableid="60i0lcfx5wkkv3sy"]`);
                                                        let player = table.querySelector('[data-role="bet-spot-Player"]');
                                                        let banker = table.querySelector('[data-role="bet-spot-Banker"]');
                                                        let tie = table.querySelector('[data-role="bet-spot-Tie"]');

                                                        let betAmount = innerDocument.querySelector('[data-role="selected-chip"]');
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
                                                    ws.send(JSON.stringify({ "msg": "[Game " + (obj.table) + "] Closing Betting..." }));
                                                    bettingDone = true;
                                                }

                                                setTimeout(() => {
                                                    console.log("[Game " + (obj.table) + "] Revealing Cards...");
                                                    ws.send(JSON.stringify({ "msg": "[Game " + (obj.table) + "] Revealing Cards..." }));
                                                }, 14 * 1000);
                                            }


                                            if (packet.args.dealing == "Finished") {
                                                let playerHand = "Player Cards : " + packet.args.gameData.playerHand.cards + " | Scores : " + packet.args.gameData.playerHand.score;
                                                let bankerHand = "Banker Cards : " + packet.args.gameData.bankerHand.cards + " | Scores : " + packet.args.gameData.bankerHand.score;
                                                let winner = "Winner : " + packet.args.gameData.result.winner;

                                                // ws.send(`${JSON.stringify(packet.args.gameData)}`);

                                                // if (bettingRecieved & bettingDone) {
                                                if (bettingDone) {
                                                    if (obj.strategy == "Martin")
                                                        switch (packet.args.gameData.result.winner) {
                                                            case obj.betFor:
                                                                console.log(`\nWINNER...! \nYou WON ${obj.betAmount} in Table ${obj.table} by betting for ${obj.betFor}`);
                                                                ws.send(JSON.stringify({ "msg": `\nWINNER...! \nYou WON ${obj.betAmount} in Table ${obj.table} by betting for ${obj.betFor}` }));
                                                                obj.betAmount = obj.initialBet;
                                                                break;
                                                            case "Tie":
                                                                console.log("\nNo winners... Game was a TIE! [ Bet Refunded ]");
                                                                ws.send(JSON.stringify({ "msg": "\nNo winners... Game was a TIE! [ Bet Refunded ]" }));
                                                                obj.betAmount = obj.initialBet;
                                                                break
                                                            default:
                                                                console.log(`\nLOST...! \nYou LOST ${obj.betAmount} in Table ${obj.table} by betting for ${obj.betFor}`);
                                                                ws.send(JSON.stringify({ "msg": `\nLOST...! \nYou LOST ${obj.betAmount} in Table ${obj.table} by betting for ${obj.betFor}` }));
                                                                if ((coinList.indexOf(obj.betAmount) + 1) < 5)
                                                                    obj.betAmount = coinList[coinList.indexOf(obj.betAmount) + 1];
                                                                else
                                                                    obj.betAmount = obj.initialBet;
                                                                break;
                                                        }
                                                    else if (obj.strategy == "Parole")
                                                        switch (packet.args.gameData.result.winner) {
                                                            case obj.betFor:
                                                                console.log(`\nWINNER...! \nYou WON ${obj.betAmount} in Table ${obj.table} by betting for ${obj.betFor}`);
                                                                ws.send(JSON.stringify({ "msg": `\nWINNER...! \nYou WON ${obj.betAmount} in Table ${obj.table} by betting for ${obj.betFor}` }));
                                                                if ((coinList.indexOf(obj.betAmount) + 1) < 5)
                                                                    obj.betAmount = coinList[coinList.indexOf(obj.betAmount) + 1];
                                                                else
                                                                    obj.betAmount = obj.initialBet;
                                                                break;
                                                            case "Tie":
                                                                console.log("\nNo winners... Game was a TIE! [ Bet Refunded ]");
                                                                ws.send(JSON.stringify({ "msg": "\nNo winners... Game was a TIE! [ Bet Refunded ]" }));
                                                                obj.betAmount = obj.initialBet;
                                                                break
                                                            default:
                                                                console.log(`\nLOST...! \nYou LOST ${obj.betAmount} in Table ${obj.table} by betting for ${obj.betFor}`);
                                                                ws.send(JSON.stringify({ "msg": `\nLOST...! \nYou LOST ${obj.betAmount} in Table ${obj.table} by betting for ${obj.betFor}` }));
                                                                obj.betAmount = obj.initialBet;
                                                                break;
                                                        }
                                                    console.log(`Next Betting : \nBetting ${obj.betAmount} for ${obj.betFor} in Table ${obj.table}  \n`);
                                                    ws.send(`Next Betting : \nBetting ${obj.betAmount} for ${obj.betFor} in Table ${obj.table} using ${obj.strategy} Strategy! \n`);
                                                    bettingDone = false;
                                                }
                                                console.log("\n[Game " + (obj.table) + "] \n" + playerHand + "\n" + bankerHand + "\n" + winner + "\n");
                                                ws.send(JSON.stringify({ "msg": "\n[Game " + (obj.table) + "] \n" + playerHand + "\n" + bankerHand + "\n" + winner + "\n" }));
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
                    if ((response.payloadData).includes("balanceUpdated")) {
                        let packet = JSON.parse(response.payloadData);

                        if (packet.type == "balanceUpdated") {

                            let newBalance = packet.args.balance;
                            if (balance != newBalance) {
                                balance = newBalance;
                                console.log(`Your balance : ${balance}`);
                                ws.send(JSON.stringify({ "type": "balance", "balance": balance }));
                            }
                        }
                    }

                });
            }


            if (data.type == "login") {
                ws.send(JSON.stringify({ "msg": 'Hello, user! I am your Betting Autobot.' }));

                gotoGame(data);
            }

            if (data.type == "betting") {
                ('Starting Betting for you...');
                // console.log(data.bettings);
                betGame(data.bettings);
            }

            // Perform actions on the website, such as clicking buttons or filling out forms

            // Send messages back to the user via the WebSocket connection
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
