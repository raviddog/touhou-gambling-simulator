#include <iostream>
#include <stdio.h>
#include <string>
#include "napi.h"
#include <sys/types.h>
#include <sys/uio.h>
#include <unistd.h>
#include <time.h>

/*
#include <stdio.h>
#include <X11/Xlib.h>
#include <X11/Intrinsic.h>
#include <X11/extensions/XTest.h>


int main() {
        Display *dis;
        dis = XOpenDisplay(NULL);
        KeyCode modcode = 0; //init value
        int i;
        for (i=0;i<5;i++) {
                modcode = XKeysymToKeycode(dis, XStringToKeysym("a"));
                XTestFakeKeyEvent(dis, modcode, False, 0);
                XFlush(dis);
                sleep(1);
                XTestFakeKeyEvent(dis, modcode, True, 0);
                XFlush(dis);
                XTestFakeKeyEvent(dis, modcode, False, 0);
                XFlush(dis);
        }
        return 0;
}
*/

pid_t pid;
const uint32_t p1score = 0x4A7E98;
const uint32_t p2score = 0x4A7E9C;
const uint32_t stage = 0x4DC690;

const uint32_t p1hp_pt = 0x4A7D94;
const uint32_t p2hp_pt = 0x4A7DCC;
const uint32_t hp_offset = 0xA8;

uint32_t p1hp = 0x4A7D94;
uint32_t p2hp = 0x4A7DCC;

class gameW : public Napi::AsyncWorker {
    public:
        gameW(Napi::Function &callback) : Napi::AsyncWorker(callback) {}
        ~gameW() {};

    void Execute() override {
        uint32_t score1 = 0, score2 = 0;

        struct iovec local[2];
        local[0].iov_base = &score1;
        local[0].iov_len = 4;
        local[1].iov_base = &score2;
        local[1].iov_len = 4;

        struct iovec remote[2];
        remote[0].iov_base = (void*)p1score;
        remote[0].iov_len = 4;
        remote[1].iov_base = (void*)p2score;
        remote[1].iov_len = 4;

        while(score1 != 2 && score2 != 2) {
            ssize_t nread = process_vm_readv(pid, local, 2, remote, 2, 0);
            if(nread < 0) {
                std::cout << errno << std::endl;
            }
        }

        if(score1 == 2) {
            val = 0;
        } else if(score2 == 2) {
            val = 1;
        }
    }

    void OnOK() override {
        using namespace Napi;
        Callback().Call({Env().Null(), Value::From(Env(), val)});
    }



    private:
        int val = 0;
};

void gameAsync(const Napi::CallbackInfo &info) {
    Napi::Function callback = info[0].As<Napi::Function>();
    gameW* g = new gameW(callback);
    g->Queue();
    //  function queued i guess
}


Napi::Value game(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    // waits for game to end and returns winner

    uint32_t score1 = 0, score2 = 0;

    struct iovec local[2];
    local[0].iov_base = &score1;
    local[0].iov_len = 4;
    local[1].iov_base = &score2;
    local[1].iov_len = 4;

    struct iovec remote[2];
    remote[0].iov_base = (void*)p1score;
    remote[0].iov_len = 4;
    remote[1].iov_base = (void*)p2score;
    remote[1].iov_len = 4;

    while(score1 != 2 && score2 != 2) {
        ssize_t nread = process_vm_readv(pid, local, 2, remote, 2, 0);
        if(nread < 0) {
            std::cout << errno << std::endl;
        }
        // std::cout << score1 << score2 << std::endl;
    }

    int val;
    if(score1 == 2) {
        val = 0;
    } else if(score2 == 2) {
        val = 1;
    }

    return Napi::Value::From(env, val);
}

Napi::Promise gameP(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();

    auto def = Napi::Promise::Deferred::New(env);
    // waits for game to end and returns winner

    uint32_t score1 = 0, score2 = 0;

    struct iovec local[2];
    local[0].iov_base = &score1;
    local[0].iov_len = 4;
    local[1].iov_base = &score2;
    local[1].iov_len = 4;

    struct iovec remote[2];
    remote[0].iov_base = (void*)p1score;
    remote[0].iov_len = 4;
    remote[1].iov_base = (void*)p2score;
    remote[1].iov_len = 4;

    while(score1 != 2 && score2 != 2) {
        ssize_t nread = process_vm_readv(pid, local, 2, remote, 2, 0);
        if(nread < 0) {
            std::cout << errno << std::endl;
        }
        // std::cout << score1 << score2 << std::endl;
    }

    int val;
    if(score1 == 2) {
        val = 0;
    } else if(score2 == 2) {
        val = 1;
    }

    def.Resolve(Napi::Value::From(env, val));
    return def.Promise();
}

void loadHP(const Napi::CallbackInfo &info) {
    struct iovec local[2];
    local[0].iov_base = &p1hp;
    local[0].iov_len = 4;
    local[1].iov_base = &p2hp;
    local[1].iov_len = 4;

    struct iovec remote[2];
    remote[0].iov_base = (void*)p1hp_pt;
    remote[0].iov_len = 4;
    remote[1].iov_base = (void*)p2hp_pt;
    remote[1].iov_len = 4;
    ssize_t nread = process_vm_readv(pid, local, 2, remote, 2, 0);
    if(nread < 0) {
        std::cout << errno << std::endl;
    }
    

    p1hp += hp_offset;
    p2hp += hp_offset;
}

Napi::Value checkHP1(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    unsigned int hp;
    
    struct iovec local[1];
    local[0].iov_base = &hp;
    local[0].iov_len = 4;
    struct iovec remote[1];
    remote[0].iov_base = (void*)p1hp;
    remote[0].iov_len = 4;
    
    ssize_t nread = process_vm_readv(pid, local, 1, remote, 1, 0);
    if(nread < 0) {
        // std::cout << "hp1 err " << errno << std::endl;
        //  player structs not initialised yet because match starting
        //  reply with full hp
        Napi::Value ret = Napi::Value::From(env, 10);
        return ret;
    }

    Napi::Value ret = Napi::Value::From(env, hp);
    return ret;
}

Napi::Value checkHP2(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    unsigned int hp;

    struct iovec local[1];
    local[0].iov_base = &hp;
    local[0].iov_len = 4;
    struct iovec remote[1];
    remote[0].iov_base = (void*)p2hp;
    remote[0].iov_len = 4;
    
    ssize_t nread = process_vm_readv(pid, local, 1, remote, 1, 0);
    if(nread < 0) {
        // std::cout << "hp2 err " << errno << std::endl;
        //  player structs not initialised yet because match starting
        //  reply with full hp
        Napi::Value ret = Napi::Value::From(env, 10);
        return ret;
    }

    Napi::Value ret = Napi::Value::From(env, hp);
    return ret;
}

void init(const Napi::CallbackInfo &info) {
    srand(time(NULL));
    std::cout << "Enter PID: ";
    std::cin >> pid;

    // Napi::Env env = info.Env();
    // if(info.Length() < 2) {
    //     //  fail
    // }
    // if(!info[0].IsNumber()) {
    //     //  fail
    // }
    // pid = info[0].As<Napi::Number>().Uint32Value();
    // printf("%d\n", pid);
}

Napi::Boolean matchRunning(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int s;
    uint32_t s1, s2;

    struct iovec local[3];
    local[0].iov_base = &s;
    local[0].iov_len = 4;
    local[1].iov_base = &s1;
    local[1].iov_len = 4;
    local[2].iov_base = &s2;
    local[2].iov_len = 4;
    struct iovec remote[3];
    remote[0].iov_base = (void*)stage;
    remote[0].iov_len = 4;
    remote[1].iov_base = (void*)p1score;
    remote[1].iov_len = 4;
    remote[2].iov_base = (void*)p2score;
    remote[2].iov_len = 4;
    
    ssize_t nread = process_vm_readv(pid, local, 3, remote, 3, 0);
    if(nread < 0) {
        std::cout << errno << std::endl;
    }
    bool b = s != -1;
    b = b && s1 != 2 && s2 != 2;

    Napi::Boolean ret = Napi::Boolean::New(env, b);
    return ret;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // init();
    exports.Set("gameAsync", Napi::Function::New(env, gameAsync));
    exports.Set("init", Napi::Function::New(env, init));
    exports.Set("loadHP", Napi::Function::New(env, loadHP));
    exports.Set("game", Napi::Function::New(env, game));
    exports.Set("gameP", Napi::Function::New(env, gameP));
    exports.Set("checkHP1", Napi::Function::New(env, checkHP1));
    exports.Set("checkHP2", Napi::Function::New(env, checkHP2));
    exports.Set("matchRunning", Napi::Function::New(env, matchRunning));
    return exports;
}

NODE_API_MODULE(read, Init);
