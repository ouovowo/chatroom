const path     = require('path');
const http     = require('http');
const Koa      = require('koa');
const serve    = require('koa-static');
const socketIO = require('socket.io');

const hostname   = '127.0.0.1';
const port       = 2233;
// const hostname   = '192.168.1.102'
// const port       = 80;
const publicPath = path.join(__dirname, 'public');

const app = new Koa();
const server = http.createServer(app.callback());
const io = socketIO(server);

const fs = require('fs');
let userData = new Map();

fs.readFile('userdata.tsv', 'utf-8', (err, data) => {
    if (err) {
        console.log(err.stack);
        return;
    }
    let s = data.toString();
    let rows = s.split('\r\n');
    for (let i = 0; i < rows.length; i++) {
        let row = rows[i].split('\t');
        if (row.length === 4) {
            userData.set( row[0], {
                password: row[1],
                nickname: row[2],
                  avatar: row[3],
            });
        }
    }
});


app.use(serve(publicPath));

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}`);
});

io.use((socket, next) => {
    const { username, password } = socket.handshake.query;
    if (!userData.has(username)) {
        console.log(username);
        return next(new Error('无效账户名'));
    }
    if (password !== userData.get(username).password) {
        console.log(password, userData[username].password);
        return next(new Error('密码错误'));
    }
    next();
});

const users_sock = new Map();
const users_data = new Map();
const history = [];

io.on('connection', (socket) => {
    const username = socket.handshake.query.username;
    users_sock.set(username, socket);
    users_data.set(username, {
        username: username,
        nickname: userData.get(username).nickname,
          avatar: userData.get(username).avatar,
    });

    console.log(`${username} connected`);

    io.sockets.emit('online', [...users_data.values()]);

    socket.on('sendMessage', (content) => {
        console.log(`${username} send a message: ${content}`);
        const message = {
            time: Date.now(),
            sender: username,
            content: content,
            avatar: userData.get(username).avatar,
        };
        history.push(message);
        io.sockets.emit('receiveMessage', message);
    });

    socket.on('disconnect', (reason) => {
        console.log(`${username} disconnected, reason: ${reason}`);
        users_sock.delete(username);
        users_data.delete(username);
        io.sockets.emit('online', [...users_data.values()]);
    });
});

app.use((ctx) => {
    if (ctx.request.path === '/history') {
        ctx.body = history;
    }
});