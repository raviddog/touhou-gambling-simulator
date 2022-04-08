const tmi = require('tmi.js');
const config = require('./config.json');
const read = require('./build/Release/read.node');
const fs = require('fs');
const cp = require('child_process');
const { syncBuiltinESMExports } = require('module');
// const read = require('./build/Debug/read.node');

const client = new tmi.Client({
    connection: {
        secure: true,
        reconnect: true
    },
    identity: {
        username: config.username,
        password: config.oauth
    },
    channels: ['#raviddog']
});

var usernames = [];
var bank = [];
var currentbets = [];

usernames = loadFromJson("usernames");
bank = loadFromJson("bank");

client.connect();
read.init();
read.loadHP();
mainLoop();


client.on('connected', (address) => {
    console.log('Connected to ' + address);
});



client.on('message', (channel, tags, message, self) => {
    if(self) return;
    if(message.substring(0, 1) == '!') {
        var args = message.slice(1).split(' ');
        if(args.length > 0) {
            if(args[0] == 'bet') {
                if(args.length > 2) {
                    //  todo edit return based on bot hp
                    var id = usernames.indexOf(tags.username);
                    if(id < 0) {
                        usernames.push(tags.username);
                        //  start with 1000
                        bank.push(1000);
                        id = usernames.indexOf(tags.username);
                    }
                    var side = args[1];
                    var amount = args[2];
                    if(side == 'left' || side == 'right') {
                        if(amount > bank[id]) {
                            client.say('#raviddog', "amount exceeds balance of " + bank[id]);
                        } else {
                            if(side == 'left') side = 0;
                            if(side == 'right') side = 1;
                            //  apply hp multipliers here

                            bank[id] -= amount;
                            amount *= 2;
                            //  place bet
                            currentbets.push({
                                user: id,
                                team: side,
                                bet: amount
                            });
                            //  do additional shit here
                            client.say('#raviddog', 'bet placed');
                        }
                    } else {
                        client.say('#raviddog', "pick left or right side");
                    }
                }
            } else if(args[0] = 'balance') {
                var id = usernames.indexOf(tags.username);
                if(id < 0) {
                    usernames.push(tags.username);
                    //  start with 1000
                    bank.push(1000);
                    id = usernames.indexOf(tags.username);
                    client.say('#raviddog', '@' + tags.username + ' balance is ' + bank[id]);
                } else {
                    client.say('#raviddog', "@" + tags.username + " balance is " + bank[id]);
                }
            } else if(args[0] = 'test') {
                client.say('#raviddog', "test");
            }
        }
    }
});


// var pid = cp.execSync('xprop -name "Touhou Kaeidzuka ~ Phantasmagoria of Flower View v1.50a" | awk "/_NET_WM_PID\\(CARDINAL\\)/{print $NF}"');
// console.log(pid);
// pid = parseInt(pid);
//console.log(read.game());
// read.init(pid);
function gameDone(err, winner) {
    console.log('match winner: ' + winner);
    var count = 0;

    // process bets

    currentbets.forEach(function(value, index) {
        var id = value.id;
        if(value.side == winner) {
            bank[id] += value.bet;
        }
        count++;

    });

    console.log('processed ' + count + ' bets');

    currentbets = [];

    //  save values
    saveToJson("usernames", usernames);
    saveToJson("bank", bank);

    // wait a bit for the menu to come up
    // start next match
    startGameFromPrev();
    read.gameAsync(gameDone);
}

function mainLoop() {
    //  wait for start command in chat


    // while not signalled to exit
    // wait for match to end
    read.gameAsync(gameDone)    
    
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

function startGameFromPrev() {
    console.log('starting next match');
    cp.execSync('sleep 1s');
    cp.execSync('xdotool keydown Control_L');
    cp.execSync('sleep 5s');
    cp.execSync('xdotool keyup Control_L');
    cp.execSync('sleep 1s');
    cp.execSync('xdotool key --delay 2000 Down Z');
    console.log('a');
    cp.execSync('sleep 5s');

    var p1 = between(0, 16);
    var p2 = between(0, 16);

    console.log('b');
    cp.execSync('xdotool key --repeat ' + p1 + ' --delay 500 Down');
    cp.execSync('xdotool key Z');
    cp.execSync('xdotool key --repeat ' + p2 + ' --delay 500 Down');
    cp.execSync('xdotool key Z');
    cp.execSync('sleep 1s');
    cp.execSync('xdotool key --delay 500 Down Z');
}

function exitCurrentGame() {
    while(!read.matchRunning());
    cp.execSync('xdotool key --delay 500 Escape Q');
}


function between(min, max) {  
    return Math.floor(
      Math.random() * (max - min) + min
    )
  }

  function saveToJson(filename, data) {
    let fullFilename = filename + '.json';
    let backupFile = filename + Date.now() + '.json';
    fs.writeFile(fullFilename, JSON.stringify(data),
        function(err) {
            if(err) console.log(err);
        });
}

function loadFromJson(filename) {
    let fullFilename = filename+'.json';
    let result = [];
    try {
        let data = fs.readFileSync(fullFilename);
        result = JSON.parse(data)
    } catch (err) {
        console.log(err);
        // result = [];
    }
    return result;
}