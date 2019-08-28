const { app, BrowserWindow, ipcMain } = require('electron')
const puppeteer = require('puppeteer');
const fs = require("fs");
const url = require('url');

let win

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.loadFile('index.html')

    // Open the DevTools.
    //win.webContents.openDevTools()


    win.on('closed', () => {
        win = null
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (win === null) {
        createWindow()
    }
})

ipcMain.on('downloadImages', (event, arg) => {

    downloadImages(arg);

    event.sender.send('return', 'teste');
})

async function downloadImages(keyWord) {
    const browser = await puppeteer.launch({
        headless: true,
    });

    const [page] = await browser.pages();

    page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3844.0 Safari/537.36');

    await page.goto('https://images.google.com');

    await page.waitForSelector('#sbtc > div > div.a4bIc > input');

    await page.type('#sbtc > div > div.a4bIc > input', keyWord + '\n');

    await page.waitForSelector('#rg_s > div:nth-child(2) > a');

    await page.click('#rg_s > div:nth-child(2) > a');

    let index = 0;
    let count = 0;

    while (count < 10) {
        const panel = (index + 1) % 3 + 2;

        const selector = `#irc-ss > div:nth-child(${panel}) > div.irc_t > div.irc_mic > div.irc_mimg.irc_hic > a > div > img`;

        await page.waitForSelector(selector);

        let imageSrc = await page.evaluate((selector) => {
            return document.querySelector(selector).getAttribute('src');
        }, [selector]);

        const saved = await saveImage(imageSrc, count);
        
        if (saved) {
            count++;
        }


        await page.focus('body');

        await page.keyboard.press('ArrowRight');

        index++;
    }

    await browser.close();


    async function saveImage(imageSrc, imageName) {
        if (!imageSrc) {
            return false;
        }

        const imagePage = await browser.newPage();
        let name = imageName;


        if (imageSrc.startsWith('data:')) {
            const { blob, extension } = dataURItoBlob(imageSrc);
            imageSrc = URL.createObjectURL(blob);
            name = `${name}.${extension}`;
        } else {
            imageSrc = imageSrc.replace('/', '');
            let imageURL = new URL(imageSrc);

            let imgPathComponents = imageURL.pathname.split('/');
            let imgNameComponents = imgPathComponents[imgPathComponents.length - 1].split('.');
            let extension = imgNameComponents[imgNameComponents.length - 1];
        
            name = `${name}.${extension}`;
            
            if (!extension) {
                await imagePage.close();
                return false;  
            } 
        }

        let viewSource = await imagePage.goto(imageSrc);

        const buffer = await viewSource.buffer();
        await imagePage.close();

        await new Promise((resolve, reject) => {

            if (!fs.existsSync(keyWord)) {
                fs.mkdirSync(keyWord);
            }

            fs.writeFile(`${keyWord}/${name}`, buffer, { recursive: true }, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        return true;

    }

    function dataURItoBlob(dataURI) {
        var mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
        var binary = atob(dataURI.split(',')[1]);
        var array = [];
        var extension = mime.split('/')[1];
        for (var i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return {
            blob: new Blob([new Uint8Array(array)], { type: mime }),
            extension,
        };
    }


}