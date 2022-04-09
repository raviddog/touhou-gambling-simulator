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
                        } else if(amount < 1) {
                            client.say('#raviddog', "bet 1 or more");
                        } else {
                            if(side == 'left') side = 0;
                            if(side == 'right') side = 1;
                            
                            bank[id] -= amount;
                            //  apply hp multipliers here
                            var multi = 2;

                            var hp1 = read.checkHP1();
                            var hp2 = read.checkHP2();

                            var diff = hp1 - hp2;
                            if(diff < 0) {
                                diff = Math.abs(diff);
                                //  hp2 higher
                                if(side == 1) {
                                    //  decrease
                                    //  diff goes 1 - 9
                                    multi -= (diff / 10);
                                }
                            } else if(diff > 0) {
                                diff = Math.abs(diff);
                                //  hp1 higher
                                if(side == 0) {
                                    //  decrease
                                    //  diff goes 1 - 9
                                    multi -= (diff / 10);
                                }
                            } else {
                                //  hp is equal, apply max multiplier
                            }
                            
                            amount *= multi;
                            amount = Math.round(amount);
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
                } else {
                    client.say('#raviddog', "!bet [left/right] [amount]");
                }
            }
            if(args[0] == 'balance') {
                var id = usernames.indexOf(tags.username);
                if(id < 0) {
                    usernames.push(tags.username);
                    //  start with 1000
                    bank.push(1000);
                    id = usernames.indexOf(tags.username);
                    client.say('#raviddog', '@' + tags.username + ' balance is raviddPoint ' + bank[id]);
                } else {
                    client.say('#raviddog', "@" + tags.username + " balance is raviddPoint " + bank[id]);
                }
            }
            if(args[0] == 'bail') {
                var id = usernames.indexOf(tags.username);
                if(id < 0) {
                    client.say('#raviddog', 'use !balance to get an initial balance');
                } else {
                    if(bank[id] == 0) {
                        var bet = -1;
                        currentbets.forEach(function(value, index) {
                            if(value.user == id) {
                                bet = 0;
                            }
                        });
                        if(bet < 0) {
                            bank[id] = 100;
                            client.say('#raviddog', 'raviddPoint 100 bail granted');
                        } else {
                            client.say('#raviddog', 'cant bail if a bet is placed');
                        }
                    } else {
                        client.say('#raviddog', 'cant bail if balance not 0');
                    }
                }
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
    var count = 0, total = 0;;

    // process bets

    currentbets.forEach(function(value, index) {
        var id = value.user;

        if(value.team == winner) {
            bank[id] += value.bet;
            total += value.bet;
        }
        count++;

    });

    console.log('processed ' + count + ' bets');
    var t;
    if(winner == 0) {t = "left"};
    if(winner == 1) {t = "right"};
    client.say('#raviddog', `match winner: ${t}, raviddPoint ${total} paid out`);

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
    cp.execSync('xdotool keydown Control_L sleep 2 keyup Control_L sleep 1');
    cp.execSync('xdotool key --delay 500 Down Z');
    cp.execSync('sleep 3s');

    var p1 = between(0, 16) + 1;
    var p2 = between(0, 16) + 1;

    cp.execSync('xdotool key --repeat ' + p1 + ' --delay 200 Down');
    cp.execSync('xdotool sleep 0.2 keydown Z sleep 0.2 keyup Z sleep 0.5');
    cp.execSync('xdotool key --repeat ' + p2 + ' --delay 200 Down');
    cp.execSync('xdotool sleep 0.2 keydown Z sleep 0.2 keyup Z sleep 0.5');
    cp.execSync('xdotool keydown Down sleep 0.2 keyup Down sleep 0.5 keydown Z sleep 0.2 keyup Z');
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
            if(err) console.log('save error ' + err);
        });
}

function loadFromJson(filename) {
    let fullFilename = filename+'.json';
    let result = [];
    try {
        let data = fs.readFileSync(fullFilename);
        result = JSON.parse(data)
    } catch (err) {
        console.log('read error ' + err);
        // result = [];
    }
    return result;
}