// 游戏状态管理
class Game {
  constructor() {
    this.socket = null;
    this.playerColor = null;
    this.roomId = null;
    this.playerName = '玩家';
    this.board = Array(15).fill(null).map(() => Array(15).fill(0));
    this.currentPlayer = 1; // 1: 黑棋, 2: 白棋
    this.gameStatus = 'waiting'; // waiting, playing, ended
    this.winner = null;
    this.canvas = null;
    this.ctx = null;
    this.cellSize = 40;
    this.boardSize = 15;
    this.padding = 20;
    
    this.initializeElements();
    this.bindEvents();
    this.initializeCanvas();
  }
  
  // 初始化DOM元素
  initializeElements() {
    // 页面元素
    this.lobbyPage = document.getElementById('lobby');
    this.gameRoomPage = document.getElementById('gameRoom');
    
    // 大厅元素
    this.playerNameInput = document.getElementById('playerName');
    this.createRoomBtn = document.getElementById('createRoomBtn');
    this.joinRoomBtn = document.getElementById('joinRoomBtn');
    this.roomIdInput = document.getElementById('roomId');
    
    // 游戏房间元素
    this.backToLobbyBtn = document.getElementById('backToLobbyBtn');
    this.roomIdDisplay = document.getElementById('roomIdDisplay');
    this.statusIndicator = document.getElementById('statusIndicator');
    this.statusText = document.getElementById('statusText');
    
    // 玩家信息元素
    this.blackPlayerName = document.getElementById('blackPlayerName');
    this.whitePlayerName = document.getElementById('whitePlayerName');
    this.blackPlayerTurn = document.getElementById('blackPlayerTurn');
    this.whitePlayerTurn = document.getElementById('whitePlayerTurn');
    
    // 控制按钮
    this.undoBtn = document.getElementById('undoBtn');
    this.restartBtn = document.getElementById('restartBtn');
    
    // 游戏状态
    this.gameStatusDisplay = document.getElementById('gameStatus');
    this.moveList = document.getElementById('moveList');
    
    // 棋盘
    this.canvas = document.getElementById('gameBoard');
  }
  
  // 绑定事件
  bindEvents() {
    this.createRoomBtn.addEventListener('click', () => this.createRoom());
    this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
    this.backToLobbyBtn.addEventListener('click', () => this.backToLobby());
    this.undoBtn.addEventListener('click', () => this.undoMove());
    this.restartBtn.addEventListener('click', () => this.restartGame());
    this.canvas.addEventListener('click', (e) => this.handleBoardClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleBoardHover(e));
    this.canvas.addEventListener('mouseleave', () => this.handleBoardLeave());
    
    // 玩家名称输入变化时更新
    this.playerNameInput.addEventListener('input', (e) => {
      this.playerName = e.target.value.trim() || '玩家';
    });
    
    // 回车键加入房间
    this.roomIdInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.joinRoom();
      }
    });
  }
  
  // 初始化Canvas
  initializeCanvas() {
    this.ctx = this.canvas.getContext('2d');
    this.drawEmptyBoard();
  }
  
  // 绘制空棋盘
  drawEmptyBoard() {
    const canvasSize = this.cellSize * (this.boardSize - 1) + 2 * this.padding;
    this.canvas.width = canvasSize;
    this.canvas.height = canvasSize;
    
    // 绘制背景
    this.ctx.fillStyle = '#F5DEB3'; // 木纹色
    this.ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    // 绘制网格线
    this.ctx.strokeStyle = '#8B4513'; // 深棕色
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i < this.boardSize; i++) {
      // 横线
      this.ctx.beginPath();
      this.ctx.moveTo(this.padding, this.padding + i * this.cellSize);
      this.ctx.lineTo(this.padding + (this.boardSize - 1) * this.cellSize, this.padding + i * this.cellSize);
      this.ctx.stroke();
      
      // 竖线
      this.ctx.beginPath();
      this.ctx.moveTo(this.padding + i * this.cellSize, this.padding);
      this.ctx.lineTo(this.padding + i * this.cellSize, this.padding + (this.boardSize - 1) * this.cellSize);
      this.ctx.stroke();
    }
    
    // 绘制星位（天元和四个角的星）
    this.drawStar(7, 7); // 天元
    this.drawStar(3, 3); // 左上
    this.drawStar(3, 11); // 左下
    this.drawStar(11, 3); // 右上
    this.drawStar(11, 11); // 右下
  }
  
  // 绘制星位
  drawStar(row, col) {
    const x = this.padding + col * this.cellSize;
    const y = this.padding + row * this.cellSize;
    
    this.ctx.fillStyle = '#8B4513';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
    this.ctx.fill();
  }
  
  // 绘制棋盘和所有棋子
  drawBoard() {
    this.drawEmptyBoard();
    
    // 绘制所有棋子
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (this.board[row][col] !== 0) {
          this.drawPiece(row, col, this.board[row][col]);
        }
      }
    }
  }
  
  // 绘制单个棋子
  drawPiece(row, col, color) {
    const x = this.padding + col * this.cellSize;
    const y = this.padding + row * this.cellSize;
    const radius = this.cellSize * 0.4;
    
    // 绘制棋子阴影
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 5;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
    
    // 绘制棋子
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    
    if (color === 1) {
      // 黑棋 - 使用径向渐变
      const gradient = this.ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius);
      gradient.addColorStop(0, '#555');
      gradient.addColorStop(1, '#000');
      this.ctx.fillStyle = gradient;
    } else {
      // 白棋 - 使用径向渐变
      const gradient = this.ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(1, '#ddd');
      this.ctx.fillStyle = gradient;
    }
    
    this.ctx.fill();
    this.ctx.restore();
    
    // 绘制棋子边框
    this.ctx.strokeStyle = color === 1 ? '#000' : '#aaa';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }
  
  // 绘制预览棋子（鼠标悬停）
  drawPreviewPiece(row, col, color) {
    const x = this.padding + col * this.cellSize;
    const y = this.padding + row * this.cellSize;
    const radius = this.cellSize * 0.4;
    
    this.ctx.save();
    this.ctx.globalAlpha = 0.5;
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = color === 1 ? '#000' : '#fff';
    this.ctx.fill();
    
    this.ctx.strokeStyle = color === 1 ? '#000' : '#aaa';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.restore();
  }
  
  // 处理棋盘点击
  handleBoardClick(event) {
    if (this.gameStatus !== 'playing' || this.currentPlayer !== this.playerColor) {
      return;
    }
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 转换为棋盘坐标
    const col = Math.round((x - this.padding) / this.cellSize);
    const row = Math.round((y - this.padding) / this.cellSize);
    
    // 检查是否在有效范围内
    if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize && this.board[row][col] === 0) {
      this.makeMove(row, col);
    }
  }
  
  // 处理棋盘悬停
  handleBoardHover(event) {
    if (this.gameStatus !== 'playing' || this.currentPlayer !== this.playerColor) {
      return;
    }
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 转换为棋盘坐标
    const col = Math.round((x - this.padding) / this.cellSize);
    const row = Math.round((y - this.padding) / this.cellSize);
    
    // 检查是否在有效范围内
    if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize && this.board[row][col] === 0) {
      this.drawBoard();
      this.drawPreviewPiece(row, col, this.playerColor);
      this.canvas.style.cursor = 'pointer';
    } else {
      this.drawBoard();
      this.canvas.style.cursor = 'default';
    }
  }
  
  // 处理鼠标离开棋盘
  handleBoardLeave() {
    this.drawBoard();
  }
  
  // 落子
  makeMove(row, col) {
    if (this.socket && this.gameStatus === 'playing' && this.currentPlayer === this.playerColor) {
      this.socket.emit('makeMove', { row, col });
    }
  }
  
  // 悔棋
  undoMove() {
    if (this.socket) {
      this.socket.emit('undoMove');
    }
  }
  
  // 重新开始游戏
  restartGame() {
    if (this.socket) {
      this.socket.emit('restartGame');
    }
  }
  
  // 连接Socket.IO服务器
  connectToServer() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      this.updateConnectionStatus(true);
      console.log('连接到服务器');
    });
    
    this.socket.on('disconnect', () => {
      this.updateConnectionStatus(false);
      console.log('与服务器的连接已断开');
    });
    
    // 房间事件
    this.socket.on('roomCreated', (data) => {
      this.roomId = data.roomId;
      this.playerColor = data.playerColor;
      this.showGameRoom();
    });
    
    this.socket.on('roomJoined', (data) => {
      this.roomId = data.roomId;
      this.playerColor = data.playerColor;
      this.showGameRoom();
    });
    
    this.socket.on('gameState', (gameState) => {
      this.updateGameState(gameState);
    });
    
    this.socket.on('gameStart', (players) => {
      this.updatePlayers(players);
      this.gameStatusDisplay.textContent = '游戏开始！';
    });
    
    this.socket.on('gameEnd', (data) => {
      const winnerText = data.winner === this.playerColor ? '你赢了！' : `${data.playerName}赢了！`;
      this.gameStatusDisplay.textContent = winnerText;
      
      // 显示获胜提示
      Swal.fire({
        title: data.winner === this.playerColor ? '恭喜获胜！' : '游戏结束',
        text: winnerText,
        icon: data.winner === this.playerColor ? 'success' : 'info',
        confirmButtonText: '确定'
      });
    });
    
    this.socket.on('gameRestarted', () => {
      this.gameStatusDisplay.textContent = '游戏重新开始！';
    });
    
    this.socket.on('playerDisconnected', (playerName) => {
      this.gameStatusDisplay.textContent = `${playerName} 已断开连接`;
      Swal.fire({
        title: '玩家断开连接',
        text: `${playerName} 已离开游戏`,
        icon: 'warning',
        confirmButtonText: '返回大厅'
      }).then((result) => {
        if (result.isConfirmed) {
          this.backToLobby();
        }
      });
    });
    
    this.socket.on('error', (message) => {
      Swal.fire({
        title: '错误',
        text: message,
        icon: 'error',
        confirmButtonText: '确定'
      });
    });
  }
  
  // 创建房间
  createRoom() {
    this.playerName = this.playerNameInput.value.trim() || '玩家';
    this.connectToServer();
    
    // 等待连接成功后再创建房间
    this.socket.on('connect', () => {
      this.socket.emit('createRoom', this.playerName);
    });
  }
  
  // 加入房间
  joinRoom() {
    const roomId = this.roomIdInput.value.trim().toUpperCase();
    
    if (!roomId) {
      Swal.fire({
        title: '请输入房间ID',
        icon: 'warning',
        confirmButtonText: '确定'
      });
      return;
    }
    
    this.playerName = this.playerNameInput.value.trim() || '玩家';
    this.connectToServer();
    
    // 等待连接成功再加入房间
    this.socket.on('connect', () => {
      this.socket.emit('joinRoom', { roomId, playerName: this.playerName });
    });
  }
  
  // 显示游戏房间
  showGameRoom() {
    this.lobbyPage.classList.remove('active');
    this.gameRoomPage.classList.add('active');
    this.roomIdDisplay.textContent = this.roomId;
    this.drawBoard();
  }
  
  // 返回大厅
  backToLobby() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.gameRoomPage.classList.remove('active');
    this.lobbyPage.classList.add('active');
    
    // 重置游戏状态
    this.board = Array(15).fill(null).map(() => Array(15).fill(0));
    this.currentPlayer = 1;
    this.gameStatus = 'waiting';
    this.winner = null;
    this.playerColor = null;
    this.roomId = null;
    this.moveList.innerHTML = '';
    
    this.drawEmptyBoard();
  }
  
  // 更新游戏状态
  updateGameState(gameState) {
    this.board = gameState.board;
    this.currentPlayer = gameState.currentPlayer;
    this.gameStatus = gameState.gameStatus;
    this.winner = gameState.winner;
    
    this.drawBoard();
    this.updateCurrentPlayer();
    this.updateMoveList(gameState.moves);
    this.updateControlButtons();
  }
  
  // 更新玩家信息
  updatePlayers(players) {
    const blackPlayer = players.find(p => p.color === 1);
    const whitePlayer = players.find(p => p.color === 2);
    
    if (blackPlayer) {
      this.blackPlayerName.textContent = blackPlayer.name;
    }
    
    if (whitePlayer) {
      this.whitePlayerName.textContent = whitePlayer.name;
    }
  }
  
  // 更新当前玩家指示器
  updateCurrentPlayer() {
    if (this.currentPlayer === 1) {
      this.blackPlayerTurn.classList.add('active');
      this.whitePlayerTurn.classList.remove('active');
    } else {
      this.blackPlayerTurn.classList.remove('active');
      this.whitePlayerTurn.classList.add('active');
    }
    
    // 更新游戏状态文本
    if (this.gameStatus === 'waiting') {
      this.gameStatusDisplay.textContent = '等待对手加入...';
    } else if (this.gameStatus === 'playing') {
      if (this.currentPlayer === this.playerColor) {
        this.gameStatusDisplay.textContent = '轮到你了';
      } else {
        this.gameStatusDisplay.textContent = '等待对手...';
      }
    } else if (this.gameStatus === 'ended') {
      if (this.winner === this.playerColor) {
        this.gameStatusDisplay.textContent = '你赢了！';
      } else {
        this.gameStatusDisplay.textContent = '你输了！';
      }
    }
  }
  
  // 更新走棋记录
  updateMoveList(moves) {
    this.moveList.innerHTML = '';
    
    moves.forEach((move, index) => {
      const moveItem = document.createElement('div');
      moveItem.className = 'move-item';
      
      const color = move.color === 1 ? '黑棋' : '白棋';
      const position = `(${move.row + 1}, ${move.col + 1})`;
      moveItem.textContent = `${index + 1}. ${color} ${position}`;
      
      this.moveList.appendChild(moveItem);
    });
    
    // 自动滚动到最新记录
    this.moveList.scrollTop = this.moveList.scrollHeight;
  }
  
  // 更新控制按钮状态
  updateControlButtons() {
    // 悔棋按钮：只有游戏进行中且当前是自己的回合时才可用
    if (this.gameStatus === 'playing' && this.currentPlayer === this.playerColor) {
      this.undoBtn.disabled = false;
    } else {
      this.undoBtn.disabled = true;
    }
  }
  
  // 更新连接状态
  updateConnectionStatus(connected) {
    if (connected) {
      this.statusIndicator.classList.remove('offline');
      this.statusIndicator.classList.add('online');
      this.statusText.textContent = '在线';
    } else {
      this.statusIndicator.classList.remove('online');
      this.statusIndicator.classList.add('offline');
      this.statusText.textContent = '离线';
    }
  }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
});