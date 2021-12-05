const username = document.getElementById('username');
const password = document.getElementById('password');
const loginbtn = document.getElementById('loginbtn');
const chatroom = document.querySelector('.chatroom');

const sendBtn = document.getElementById('sendBtn');
const sendMsg = document.getElementById('sendMsg');
const chatLog = document.querySelector('.list');

const contact_list = document.querySelector('.contact-list');
let userData = new Map();
let socket = null;

function drawMsg(message) {
    let itemF = document.createElement('div');
    if (message.sender === username.value)
        itemF.setAttribute('class', 'list-item list-item-right');
    else
        itemF.setAttribute('class', 'list-item list-item-left');
    let itemS = document.createElement('div');
    itemS.setAttribute('class', 'message');
    itemS.innerHTML = message.content;
    let itemI = document.createElement('img');
    itemI.setAttribute('class', 'avatar');
    itemI.setAttribute('src', './avatar/'+message.avatar);
    itemF.appendChild(itemS);
    itemF.appendChild(itemI);
    chatLog.appendChild(itemF);
    chatLog.scrollTop = chatLog.scrollHeight;
}

loginbtn.addEventListener('click', function() {
    socket = io({
        query: {
            username: username.value,
            password: password.value,
        },
        reconnection: false,
    });

    socket.on('connection_error', (err) => {
        if (err && (err.message === 'INVALID_USERNAME' || err.message === 'INVALID_PASSWORD')) {
            alert('认证失败');
            return;
        }
        alert('连接失败，请检查 WebSocket 服务端');
    });

    socket.on('connect', () => {
        chatLog.scrollTop = chatLog.scrollHeight;
        chatroom.style.transition = '0.5s';
        chatroom.style.top = '0';
        while (chatLog.hasChildNodes()) {
            chatLog.removeChild(chatLog.firstChild);
        }
        fetch('/history').then(res => res.json()).then((history) => {
            console.log('history:', history);
            for (let i = 0; i < history.length; i++) {
                drawMsg(history[i]);
            }
        })
    });

    socket.on('disconnect', () => {
        // disconnect
    });

    socket.on('receiveMessage', (message) => {
        console.log('received a broadcast message:', message);
        drawMsg(message);
    });

    socket.on('online', (users) => {
        console.log('online users:', users);
        while (contact_list.hasChildNodes()) {
            contact_list.removeChild(contact_list.firstChild);
        }
        for (let i = 0; i < users.length; i++) {
            userData.set(users[i].username, {
                nickname: users[i].nickname,
                  avatar: users[i].avatar,
            });
            let item = document.createElement('li');
            if (users[i].username === username.value)
                item.setAttribute('class', 'contact-item contact-item-selected');
            else
                item.setAttribute('class', 'contact-item');
            item.innerHTML = users[i].nickname;
            contact_list.appendChild(item);
        }
    });
});

sendBtn.addEventListener('click', function() {
    let msg = sendMsg.value;
    if (msg == '')
        return;
    sendMsg.value = '';
    socket.emit('sendMessage', msg);
});