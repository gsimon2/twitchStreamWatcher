const puppeteer = require('puppeteer');
const ArgumentParser = require('argparse').ArgumentParser;
const requestPassword = require('./passwordManager');

const parseArgs = () => {
    const parser = new ArgumentParser({
        add_help: true,
        description: 'Automated browser to watch a twitch stream and collect coins'
    });

    parser.add_argument(
        '--user', '-u',
        {
            help: 'Username to log into twitch with'
        }
    );

    parser.add_argument(
        '--verbose', '-v',
        {
            help: 'Print extra output to console',
            action: 'store_true',
            default: false
        }
    );

    parser.add_argument(
        '--twitchStreamer', '-t',
        {
            help: 'User name of the twitch stream to watch',
            default: 'poke_beng'
        }
    )

    return parser.parse_args();
}
class TwitchStreamWatcher {
    
    constructor() {
        console.log('Im awake');
        let args = parseArgs();
        this.userName = args.user;
        this.verbose = args.verbose;
        this.twitchStreamer = args.twitchStreamer;
        console.log(`I am watching the twitch stream for ${this.twitchStreamer}`);

        this.bonusesClaimed = 0;

        this.pollingInterval = 60000;
        this.browserConfig = {
            headless: false,
            slowMo: 25,
            defaultViewport: null,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: []
        };
    }

    run = async () => {
        this.password = await requestPassword('Twitch Password > ');

        this.browser = await puppeteer.launch(this.browserConfig);
        this.page = await this.browser.newPage();
        await this.page.goto(`https://www.twitch.tv/${this.twitchStreamer}`);
        await this.signIn(this.page);

        this.startPoll();

        // Run Forever
        process.stdin.resume();
    }

    startPoll = async () => {
        setInterval(async () => {
            await this.checkForBonus();
        }, this.pollingInterval);
    }

    signIn = async () => {
        console.log('Signing in...');
        let signInButton = '[data-test-selector="anon-user-menu__login-button"]';
        let logInButton = '[data-a-target="passport-login-button"]';
        let signInUsernameInput = '#login-username';
        let signInPasswordInput = '#password-input';
        let accountButton = '[data-a-target="user-menu-toggle"]'

        await this.page.waitForSelector(signInButton);
        await this.page.click(signInButton);
        await this.page.waitForSelector(signInUsernameInput);
        await this.page.type(signInUsernameInput, this.userName);
        await this.page.type(signInPasswordInput, this.password);
        await this.page.click(logInButton);
        await this.page.waitForSelector(accountButton);

        console.log('Successfully logged in');
    }

    checkForBonus = async () => {
        this.verbose && console.log('Checking for bonus...');
        let bonusSelector = '[aria-label="Claim Bonus"]';
        let balanceSelector = '[data-test-selector="balance-string"]';
        let bonus = await this.page.$(bonusSelector);
        let balanace = await this.page.$(balanceSelector);

        try{
            if (bonus) {
                this.verbose && console.log('Bonus found');
                await bonus.click();
                console.log('Bonus claimed!');
                this.bonusesClaimed++;
            } else {
                this.verbose && console.log('No bonus found');
            }
        } catch (ex) {
            console.error('failed to claim bonus');
            console.error(ex);
            // oh wellsd
        }

        try {
            let pointsString = await balanace.evaluate( el => el.textContent );
            console.log(`Current points: ${pointsString}. Bonuses claimed: ${this.bonusesClaimed}.`);
        } catch (ex) {
            console.error('failed to display balance');
            console.error(ex);
            // oh well
        }
    }
}

let watcher = new TwitchStreamWatcher();
watcher.run();
