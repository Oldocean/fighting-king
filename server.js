/**
 * 格斗之王 - 在线对战服务器
 * Fighting King - Online Battle Server
 * 
 * 使用方法:
 * 1. npm install
 * 2. npm start
 * 3. 浏览器打开 http://localhost:3000
 * 
 * 远程对战需要:
 * - 将服务器部署到公网服务器(如阿里云/腾讯云)
 * - 或使用 ngrok 等内网穿透工具
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

// HTTP 服务器 - 提供静态文件
const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);
  
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(content);
    }
  });
});

// WebSocket 服务器
const wss = new WebSocketServer({ server });

// 房间管理
const rooms = new Map();
const players = new Map();

// 生成房间ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 消息类型
const MSG = {
  // 客户端 -> 服务器
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  GAME_INPUT: 'game_input',
  READY: 'ready',
  CHAT: 'chat',
  
  // 服务器 -> 客户端
  ROOM_CREATED: 'room_created',
  ROOM_JOINED: 'room_joined',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_START: 'game_start',
  OPPONENT_INPUT: 'opponent_input',
  ERROR: 'error',
  ROOM_LIST: 'room_list',
};

// 广播消息到房间
function broadcastToRoom(roomId, message, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const data = JSON.stringify(message);
  for (const player of room.players) {
    if (player.ws !== excludeWs && player.ws.readyState === 1) {
      player.ws.send(data);
    }
  }
}

// 发送消息给指定玩家
function sendToPlayer(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

wss.on('connection', (ws) => {
  const playerId = Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  let currentRoom = null;
  let playerIndex = -1;
  
  console.log(`[连接] 玩家 ${playerId} 已连接`);
  
  // 发送欢迎消息
  sendToPlayer(ws, {
    type: 'welcome',
    playerId: playerId,
    roomCount: rooms.size
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case MSG.CREATE_ROOM: {
          // 创建房间
          if (currentRoom) {
            sendToPlayer(ws, { type: MSG.ERROR, message: '你已经在房间中' });
            return;
          }
          
          const roomId = generateRoomId();
          const room = {
            id: roomId,
            players: [],
            createdAt: Date.now(),
            gameStarted: false,
            hostCharIdx: message.charIdx || 0
          };
          
          const player = {
            id: playerId,
            ws: ws,
            index: 0,
            ready: false,
            charIdx: message.charIdx || 0
          };
          
          room.players.push(player);
          rooms.set(roomId, room);
          currentRoom = roomId;
          playerIndex = 0;
          players.set(playerId, { roomId, index: 0 });
          
          sendToPlayer(ws, {
            type: MSG.ROOM_CREATED,
            roomId: roomId,
            playerIndex: 0,
            message: `房间 ${roomId} 已创建，等待对手加入...`
          });
          
          console.log(`[房间] 玩家 ${playerId} 创建了房间 ${roomId}`);
          break;
        }
        
        case MSG.JOIN_ROOM: {
          // 加入房间
          if (currentRoom) {
            sendToPlayer(ws, { type: MSG.ERROR, message: '你已经在房间中' });
            return;
          }
          
          const room = rooms.get(message.roomId?.toUpperCase());
          if (!room) {
            sendToPlayer(ws, { type: MSG.ERROR, message: '房间不存在' });
            return;
          }
          
          if (room.players.length >= 2) {
            sendToPlayer(ws, { type: MSG.ERROR, message: '房间已满' });
            return;
          }
          
          if (room.gameStarted) {
            sendToPlayer(ws, { type: MSG.ERROR, message: '游戏已开始' });
            return;
          }
          
          const player = {
            id: playerId,
            ws: ws,
            index: 1,
            ready: false,
            charIdx: message.charIdx || 1
          };
          
          room.players.push(player);
          currentRoom = message.roomId.toUpperCase();
          playerIndex = 1;
          players.set(playerId, { roomId: currentRoom, index: 1 });
          
          // 通知加入者
          sendToPlayer(ws, {
            type: MSG.ROOM_JOINED,
            roomId: currentRoom,
            playerIndex: 1,
            message: `已加入房间 ${currentRoom}`
          });
          
          // 通知房间内其他玩家
          broadcastToRoom(currentRoom, {
            type: MSG.PLAYER_JOINED,
            playerId: playerId,
            message: '对手已加入房间！'
          }, ws);
          
          console.log(`[房间] 玩家 ${playerId} 加入了房间 ${currentRoom}`);
          
          // 房间满员，通知双方可以开始
          if (room.players.length === 2) {
            broadcastToRoom(currentRoom, {
              type: 'both_ready',
              message: '双方已就位，准备开始游戏！'
            });
          }
          break;
        }
        
        case MSG.READY: {
          // 玩家准备
          const room = rooms.get(currentRoom);
          if (!room) return;
          
          const player = room.players[playerIndex];
          if (player) {
            player.ready = true;
            player.charIdx = message.charIdx;
          }
          
          // 检查是否双方都准备
          if (room.players.length === 2 && room.players.every(p => p.ready)) {
            room.gameStarted = true;
            broadcastToRoom(currentRoom, {
              type: MSG.GAME_START,
              p1CharIdx: room.players[0].charIdx,
              p2CharIdx: room.players[1].charIdx,
              message: '游戏开始！'
            });
            console.log(`[游戏] 房间 ${currentRoom} 游戏开始`);
          }
          break;
        }
        
        case MSG.GAME_INPUT: {
          // 转发游戏输入给对手
          if (!currentRoom) return;
          
          broadcastToRoom(currentRoom, {
            type: MSG.OPPONENT_INPUT,
            input: message.input,
            frame: message.frame,
            timestamp: message.timestamp
          }, ws);
          break;
        }
        
        case MSG.LEAVE_ROOM: {
          // 离开房间
          if (currentRoom) {
            const room = rooms.get(currentRoom);
            if (room) {
              broadcastToRoom(currentRoom, {
                type: MSG.PLAYER_LEFT,
                playerId: playerId,
                message: '对手已离开房间'
              });
              
              // 从房间移除玩家
              room.players = room.players.filter(p => p.id !== playerId);
              
              // 如果房间空了，删除房间
              if (room.players.length === 0) {
                rooms.delete(currentRoom);
                console.log(`[房间] 房间 ${currentRoom} 已删除`);
              }
            }
            currentRoom = null;
            playerIndex = -1;
            players.delete(playerId);
          }
          break;
        }
        
        case MSG.CHAT: {
          // 聊天消息
          if (currentRoom) {
            broadcastToRoom(currentRoom, {
              type: MSG.CHAT,
              playerId: playerId,
              message: message.message
            }, ws);
          }
          break;
        }
        
        case 'get_rooms': {
          // 获取房间列表
          const roomList = [];
          for (const [id, room] of rooms) {
            if (room.players.length < 2 && !room.gameStarted) {
              roomList.push({
                id: id,
                players: room.players.length,
                createdAt: room.createdAt
              });
            }
          }
          sendToPlayer(ws, { type: MSG.ROOM_LIST, rooms: roomList });
          break;
        }
      }
    } catch (err) {
      console.error('[错误] 消息处理失败:', err);
    }
  });
  
  ws.on('close', () => {
    console.log(`[断开] 玩家 ${playerId} 已断开`);
    
    // 清理房间
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        broadcastToRoom(currentRoom, {
          type: MSG.PLAYER_LEFT,
          playerId: playerId,
          message: '对手已断开连接'
        });
        
        room.players = room.players.filter(p => p.id !== playerId);
        
        if (room.players.length === 0) {
          rooms.delete(currentRoom);
          console.log(`[房间] 房间 ${currentRoom} 已删除`);
        }
      }
    }
    players.delete(playerId);
  });
  
  ws.on('error', (err) => {
    console.error(`[错误] 玩家 ${playerId}:`, err.message);
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   格斗之王 - 在线对战服务器                              ║
║   Fighting King - Online Battle Server                   ║
║                                                           ║
║   HTTP 服务器: http://localhost:${PORT}                      ║
║   WebSocket:  ws://localhost:${PORT}                         ║
║                                                           ║
║   本地游戏: 打开浏览器访问上述地址                         ║
║   远程对战: 需要将服务器部署到公网或使用内网穿透           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// 定期清理空房间
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    // 清理超过30分钟的空房间
    if (room.players.length === 0 && now - room.createdAt > 30 * 60 * 1000) {
      rooms.delete(id);
      console.log(`[清理] 删除过期房间 ${id}`);
    }
  }
}, 60 * 1000);
