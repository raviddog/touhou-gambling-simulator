#include <iostream>
#include <Windows.h>
#include <string>
#include <napi.h>

HANDLE proc;
const DWORD p1score = 0x4A7E98;
const DWORD p2score = 0x4A7E9C;
const DWORD stage = 0x4DC690;

const DWORD p1hp_pt = 0x4A7D94;
const DWORD p2hp_pt = 0x4A7DCC;
const DWORD hp_offset = 0xA8;

DWORD p1hp = 0x4A7D94;
DWORD p2hp = 0x4A7DCC;

Napi::Value game(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();

    //  start game

    //  wait for game to start
    //  track hp pointers
    uint32_t score1 = 0, score2 = 0;

    while(score1 != 2 && score2 != 2) {
        ReadProcessMemory(proc, (LPCVOID)p1score, &score1, 4, NULL);
        ReadProcessMemory(proc, (LPCVOID)p2score, &score2, 4, NULL);
        std::cout << score1 << score2 << std::endl;
    }

    int val;
    if(score1 == 2) {
        val = 0;
    } else if(score2 == 2) {
        val = 1;
    }


    Napi::Value ret = Napi::Value::From(env, val);
    return ret;
}

void loadHP(const Napi::CallbackInfo &info) {
    ReadProcessMemory(proc, (LPCVOID)p1hp_pt, &p1hp, 4, NULL);
    ReadProcessMemory(proc, (LPCVOID)p2hp_pt, &p2hp, 4, NULL);

    p1hp += hp_offset;
    p2hp += hp_offset;
}

Napi::Value checkHP1(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    unsigned int hp;
    ReadProcessMemory(proc, (LPCVOID)p1hp, &hp, 4, NULL);
    Napi::Value ret = Napi::Value::From(env, hp);
    return ret;
}

Napi::Value checkHP2(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    unsigned int hp;
    ReadProcessMemory(proc, (LPCVOID)p2hp, &hp, 4, NULL);
    Napi::Value ret = Napi::Value::From(env, hp);
    return ret;
}

void init() {
    unsigned long pid;
    std::cout << "Enter PID: ";
    std::cin >> pid;
    proc = OpenProcess(PROCESS_VM_READ, FALSE, pid);
}

void close(const Napi::CallbackInfo &info) {
    CloseHandle(proc);
}

Napi::Boolean matchRunning(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int s;
    uint32_t s1, s2;
    ReadProcessMemory(proc, (LPCVOID)stage, &s, 4, NULL);
    ReadProcessMemory(proc, (LPCVOID)p1score, &s1, 4, NULL);
    ReadProcessMemory(proc, (LPCVOID)p2score, &s2, 4, NULL);

    bool b = s != -1;
    b = b && s1 != 2 && s2 != 2;

    Napi::Boolean ret = Napi::Boolean::New(env, b);
    return ret;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    init();
    // exports.Set("init", Napi::Function::New(env, init));
    exports.Set("loadHP", Napi::Function::New(env, loadHP));
    exports.Set("close", Napi::Function::New(env, close));
    exports.Set("game", Napi::Function::New(env, game));
    exports.Set("checkHP1", Napi::Function::New(env, checkHP1));
    exports.Set("checkHP2", Napi::Function::New(env, checkHP2));
    exports.Set("matchRunning", Napi::Function::New(env, matchRunning));
    return exports;
}

NODE_API_MODULE(read, Init);
