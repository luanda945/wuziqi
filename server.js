const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中间件配置
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// 路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 游戏房间管理
const rooms = {};
const players = {};

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);
  
  // 创建房间
  socket.on('createRoom', (playerName) => {
    const roomId = generateRoomId();
    rooms[roomId] = {
      id: roomId,
      players: [],
      board: Array(15).fill(null).map(() => Array(15).fill(0)),
      currentPlayer: 1, // 1: 黑棋, 2: 白棋
      gameStatus: 'waiting', // waiting, playing, ended
      winner: null,
      moves: []
    };
    
    socket.join(roomId);
    players[socket.id] = {
      name: playerName,
      room: roomId,
      color: 1 // 黑棋
    };
    
    rooms[roomId].players.push({
      id: socket.id,
      name: playerName,
      color: 1
    });
    
    socket.emit('roomCreated', { roomId, playerColor: 1 });
    socket.emit('gameState', rooms[roomId]);
    
    console.log(`房间 ${roomId} 已创建，创建者: ${playerName}`);
  });
  
  // 加入房间
  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      socket.emit('error', '房间不存在');
      return;
    }
    
    if (rooms[roomId].players.length >= 2) {
      socket.emit('error', '房间已满');
      return;
    }
    
    socket.join(roomId);
    players[socket.id] = {
      name: playerName,
      room: roomId,
      color: 2 // 白棋
    };
    
    rooms[roomId].players.push({
      id: socket.id,
      name: playerName,
      color: 2
    });
    
    rooms[roomId].gameStatus = 'playing';
    
    socket.emit('roomJoined', { roomId, playerColor: 2 });
    io.to(roomId).emit('gameState', rooms[roomId]);
    io.to(roomId).emit('gameStart', rooms[roomId].players);
    
    console.log(`玩家 ${playerName} 加入房间 ${roomId}`);
  });
  
  // 处理落子
  socket.on('makeMove', ({ row, col }) => {
    const player = players[socket.id];
    if (!player || !rooms[player.room]) {
      socket.emit('error', '无效的操作');
      return;
    }
    
    const room = rooms[player.room];
    
    // 检查是否轮到当前玩家
    if (room.currentPlayer !== player.color) {
      socket.emit('error', '还没轮到你');
      return;
    }
    
    // 检查位置是否已被占用
    if (room.board[row][col] !== 0) {
      socket.emit('error', '此位置已有棋子');
      return;
    }
    
    // 落子
    room.board[row][col] = player.color;
    room.moves.push({ row, col, color: player.color });
    
    // 检查胜负
    if (checkWinner(room.board, row, col, player.color)) {
      room.gameStatus = 'ended';
      room.winner = player.color;
      
      io.to(player.room).emit('gameState', room);
      io.to(player.room).emit('gameEnd', { winner: player.color, playerName: player.name });
    } else {
      // 切换玩家
      room.currentPlayer = room.currentPlayer === 1 ? 2 : 1;
      io.to(player.room).emit('gameState', room);
    }
  });
  
  // 重新开始游戏
  socket.on('restartGame', () => {
    const player = players[socket.id];
    if (!player || !rooms[player.room]) {
      socket.emit('error', '无效的操作');
      return;
    }
    
    const room = rooms[player.room];
    room.board = Array(15).fill(null).map(() => Array(15).fill(0));
    room.currentPlayer = 1;
    room.gameStatus = 'playing';
    room.winner = null;
    room.moves = [];
    
    io.to(player.room).emit('gameState', room);
    io.to(player.room).emit('gameRestarted');
  });
  
  // 悔棋
  socket.on('undoMove', () => {
    const player = players[socket.id];
    if (!player || !rooms[player.room]) {
      socket.emit('error', '无效的操作');
      return;
    }
    
    const room = rooms[player.room];
    
    if (room.moves.length === 0) {
      socket.emit('error', '没有可以悔棋的步骤');
      return;
    }
    
    const lastMove = room.moves.pop();
    room.board[lastMove.row][lastMove.col] = 0;
    room.currentPlayer = lastMove.color;
    
    io.to(player.room).emit('gameState', room);
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
    
    const player = players[socket.id];
    if (player && rooms[player.room]) {
      const room = rooms[player.room];
      
      // 通知房间内其他玩家
      socket.to(player.room).emit('playerDisconnected', player.name);
      
      // 清理房间（如果房间里没有玩家了）
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) {
        delete rooms[player.room];
      } else {
        room.gameStatus = 'waiting';
        io.to(player.room).emit('gameState', room);
      }
    }
    
    delete players[socket.id];
  });
});

// 生成随机房间ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 检查是否有玩家获胜
function checkWinner(board, row, col, color) {
  // 检查四个方向：横、竖、左斜、右斜
  const directions = [
    [[0, 1], [0, -1]],   // 横向
    [[1, 0], [-1, 0]],   // 竖向
    [[1, 1], [-1, -1]],  // 左斜
    [[1, -1], [-1, 1]]   // 右斜
  ];
  
  for (const direction of directions) {
    let count = 1; // 当前棋子已计1个
    
    // 检查正方向
    for (let i = 1; i < 5; i++) {
      const newRow = row + direction[0][0] * i;
      const newCol = col + direction[0][1] * i;
      
      if (newRow < 0 || newRow >= 15 || newCol < 0 || newCol >= 15 || 
          board[newRow][newCol] !== color) {
        break;
      }
      count++;
    }
    
    // 检查反方向
    for (let i = 1; i < 5; i++) {
      const newRow = row + direction[1][0] * i;
      const newCol = col + direction[1][1] * i;
      
      if (newRow < 0 || newRow >= 15 || newCol < 0 || newCol >= 15 || 
          board[newRow][newCol] !== color) {
        break;
      }
      count++;
    }
    
    // 如果连成五个或以上，判定获胜
    if (count >= 5) {
      return true;
    }
  }
  
  return false;
}

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`五子棋服务器运行在 http://localhost:${PORT}`);
});