const tmi = require('tmi.js');
const config = require('./config.json');
const read = require('./build/Release/read.node');
const fs = require('fs');
const cp = require('child_process');
const { syncBuiltinESMExports } = require('module');
// const read = require('./build/Debug/read.node');
const https = require('https');

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

var wins = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var losses = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

var leaderboard = [];
//  name
//  bank
leaderboard = loadFromJson("leaderboard");
wins = loadFromJson("wins");
losses = loadFromJson("losses");

var pollid;
var poll_left, poll_right;

const postparams = {
    host: 'api.twitch.tv', //No need to include 'http://' or 'www.'
    port: 443,
    path: '/helix/predictions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json', //Specifying to the server that we are sending JSON 
        'Authorization' : 'Bearer ' + config.auth,
        'Client-Id' : config.client_id
    }
};

const patchparams = {
    host: 'api.twitch.tv', //No need to include 'http://' or 'www.'
    port: 443,
    path: '/helix/predictions',
    method: 'PATCH',
    headers: {
        'Content-Type': 'application/json', //Specifying to the server that we are sending JSON 
        'Authorization' : 'Bearer ' + config.auth,
        'Client-Id' : config.client_id
    }
};

function processLeaderboard(dd) {
    
    var winning = dd.data[0].winning_outcome_id;
    var winners = [];

    if(dd.data[0].winning_outcome_id == dd.data[0].outcomes[0].id) {
        winners = dd.data[0].outcomes[0].top_predictors;
    } else if(dd.data[0].winning_outcome_id == dd.data[0].outcomes[1].id) {
        winners = dd.data[0].outcomes[1].top_predictors;
    }
    
    winners.forEach(function (element, index) {
        var l = leaderboard.find(function(cur) {
            return cur.name == element.user_name;
        });
        if(l === null || l === undefined) {
            var tmp = {
                "name" : element.user_name,
                "bank" : 0
            }
            leaderboard.push(tmp);
            l = tmp;
        }

        l.bank += element.channel_points_used;
        l.bank += element.channel_points_won;
    });

    leaderboard.sort(function(a, b) {
        if(a.bank > b.bank) return -1;
        if(a.bank < b.bank) return 1;
        return 0;
    });

    var niceLeaderboardUsers = "";
    var niceLeaderboardBank = "";

    leaderboard.forEach(function (element) {
        niceLeaderboardUsers += element.name + "\n";
        niceLeaderboardBank += element.bank + "\n";
    });

    writeRaw("niceLeaderboardUsers", niceLeaderboardUsers);
    writeRaw("niceLeaderboardBank", niceLeaderboardBank);

    saveToJson("leaderboard", leaderboard);
}


client.on('connected', (address) => {
    console.log('Connected to ' + address);
});


client.on('message', (channel, tags, message, self) => {
    if(self) return;
    if(message.substring(0, 1) == '!') {
        var args = message.slice(1).split(' ');
        if(args.length > 0) {
            /*
            if(args[0] == 'bet') {
                if(args.length == 3) {
                    //  todo edit return based on bot hp
                    var id = usernames.indexOf(tags.username);
                    if(id < 0) {
                        usernames.push(tags.username);
                        //  start with 1000
                        bank.push(1000);
                        id = usernames.indexOf(tags.username);
                    }
                    var side = args[1];
                    var amount = parseInt(args[2]);
                    if(side == 'left' || side == 'right') {
						if(isNaN(amount)) {
                            client.say('#raviddog', "bet with number");
						} else if(amount > bank[id]) {
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
            }*/
        }
    }
});

function roundtwo(err) {
    var data = {
        "broadcaster_id" : "57079379",
        "id" : pollid,
        "status" : "LOCKED",
    };

    sendPollEnd(JSON.stringify(data));
}


// var pid = cp.execSync('xprop -name "Touhou Kaeidzuka ~ Phantasmagoria of Flower View v1.50a" | awk "/_NET_WM_PID\\(CARDINAL\\)/{print $NF}"');
// console.log(pid);
// pid = parseInt(pid);
//console.log(read.game());
// read.init(pid);
function gameDone(err, winner) {
    console.log('match winner: ' + winner);
//	stuff the shit in the end of endpoll
    endPoll(winner);
    
    // wait a bit for the menu to come up
    // start next match
//    startGameFromPrev();
//    read.gameAsync(gameDone);
    // client.say('#raviddog', winnermsg);

    //  start poll
//    startPoll();
//    read.waitRoundAsync(roundtwo);
    

}

function startPoll() {
    const shots = [
        "Reimu",
        "Marisa",
        "Sakuya",
        "Youmu",
        "Reisen",
        "Cirno",
        "Lyrica",
        "Mystia",
        "Tewi",
        "Yuuka",
        "Aya",
        "Medicine",
        "Komachi",
        "Eiki",
        "Merlin",
        "Lunasa"
    ];

    cp.execSync('sleep 3s');

    var p1 = read.checkChar1();
    if(p1 >= 0 && p1 <= 15) {
        p1 = shots[p1];
    }

    var p2 = read.checkChar2();
    if(p2 >= 0 && p2 <= 15) {
        p2 = shots[p2];
    }

    var data = {
        "broadcaster_id" : "57079379",
        "title" : `${p1} vs ${p2}`,
        "outcomes" : [
            {
                "title" : p1
            },
            {
                "title" : p2
            }
        ],
        "prediction_window" : 1800
    };
    console.log(data);

    sendPoll(JSON.stringify(data));

    
}


function endPoll(winner) {
    var p1 = read.checkChar1();
    var p2 = read.checkChar2();

    var w;
    if(winner < 1) {
        w = poll_left;
        if(p1 != p2) {
            wins[p1] += 1;
            losses[p2] += 1;
        }
    }
    if(winner > 0) {
        w = poll_right;
        if(p1 != p2) {
            wins[p2] += 1;
            losses[p1] += 1;
        }
    }

    
    var niceWins = "";
    var niceLosses = "";

    wins.forEach(function(element) {
        niceWins += element + "\n";
    });

    losses.forEach(function(element) {
        niceLosses += element + "\n";
    });

    writeRaw("niceWins", niceWins);
    writeRaw("niceLosses", niceLosses);

    saveToJson("wins", wins);
    saveToJson("losses", losses);

    var data = {
        "broadcaster_id" : "57079379",
        "id" : pollid,
        "status" : "RESOLVED",
        "winning_outcome_id" : w
    };

    sendPollEnd(JSON.stringify(data));
}

function sendPoll(d) {
    function OnResponse(response) {
        var data = '';

        response.on('data', function(chunk) {
            data += chunk; //Append each chunk of data received to this variable.
        });
        response.on('end', function() {
            try {
                var dd = JSON.parse(data);
                pollid = dd.data[0].id;
                poll_left = dd.data[0].outcomes[0].id;
                poll_right = dd.data[0].outcomes[1].id;
            } catch (e) {
                console.log(e)
		console.log(data);
            }
        });
    }

    var request = https.request(postparams, OnResponse); //Create a request object.

    request.write(d); //Send off the request.
    request.end(); //End the request.
}

function sendPollEnd(d) {
    function OnResponse(response) {
        var data = '';

        response.on('data', function(chunk) {
            data += chunk; //Append each chunk of data received to this variable.
        });
        response.on('end', function() {
            try {
                var dd = JSON.parse(data);
                processLeaderboard(dd);
            } catch (e) {
                console.log(e);
                console.log(data);
            }
            //  parse data for leaderboards
        
            //  dont do anything?
            startGameFromPrev();
    	    read.gameAsync(gameDone);
            // client.say('#raviddog', winnermsg);

        //  start poll
            startPoll();
        });
    }

    var request = https.request(patchparams, OnResponse); //Create a request object.

    request.write(d); //Send off the request.
    request.end(); //End the request.
}

function mainLoop() {
    //  wait for start command in chat
    startPoll();


    // while not signalled to exit
    // wait for match to end
    read.gameAsync(gameDone);
   // read.waitRoundAsync(roundtwo);
    
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
    let fullFilename = config.statfolder + filename + '.json';
    let backupFile = filename + Date.now() + '.json';
    fs.writeFile(fullFilename, JSON.stringify(data),
        function(err) {
            if(err) console.log('save error ' + err);
        });
}

function writeRaw(filename, data) {
    let fullFilename = config.statfolder + filename + '.txt';
    fs.writeFile(fullFilename, data,
        function(err) {
            if(err) console.log('save error ' + err);
        });
}

function loadFromJson(filename) {
    let fullFilename = config.statfolder + filename+'.json';
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



client.connect();
read.init();
read.loadHP();
mainLoop();
