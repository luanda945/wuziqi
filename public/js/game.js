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
    this.boardElement = null;
    this.boardSize = 15;
    this.previewCell = null;
    
    this.initializeElements();
    this.createBoard();
    this.bindEvents();
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
    this.boardElement = document.getElementById('gameBoard');
  }
  
  // 绑定事件
  bindEvents() {
    this.createRoomBtn.addEventListener('click', () => this.createRoom());
    this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
    this.backToLobbyBtn.addEventListener('click', () => this.backToLobby());
    this.undoBtn.addEventListener('click', () => this.undoMove());
    this.restartBtn.addEventListener('click', () => this.restartGame());
    this.boardElement.addEventListener('click', (e) => this.handleBoardClick(e));
    this.boardElement.addEventListener('mouseover', (e) => this.handleBoardHover(e));
    this.boardElement.addEventListener('mouseout', (e) => this.handleBoardLeave(e));
    
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
  
  // 创建Excel风格棋盘
  createBoard() {
    const table = document.createElement('table');
    table.className = 'excel-board-table';
    
    // 表头行（列号 A-O）
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // 左上角空白单元格
    const cornerCell = document.createElement('th');
    cornerCell.className = 'excel-corner';
    headerRow.appendChild(cornerCell);
    
    for (let col = 0; col < this.boardSize; col++) {
      const th = document.createElement('th');
      th.className = 'excel-header';
      th.textContent = String.fromCharCode(65 + col); // A, B, C...
      headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 数据行
    const tbody = document.createElement('tbody');
    for (let row = 0; row < this.boardSize; row++) {
      const tr = document.createElement('tr');
      
      // 行号
      const rowHeader = document.createElement('th');
      rowHeader.className = 'excel-header';
      rowHeader.textContent = row + 1;
      tr.appendChild(rowHeader);
      
      for (let col = 0; col < this.boardSize; col++) {
        const td = document.createElement('td');
        td.className = 'excel-cell';
        td.dataset.row = row;
        td.dataset.col = col;
        tr.appendChild(td);
      }
      
      tbody.appendChild(tr);
    }
    
    table.appendChild(tbody);
    this.boardElement.innerHTML = '';
    this.boardElement.appendChild(table);
  }
  
  // 渲染棋盘（根据当前 board 状态更新单元格）
  renderBoard() {
    const cells = this.boardElement.querySelectorAll('.excel-cell');
    
    cells.forEach((cell) => {
      const row = parseInt(cell.dataset.row, 10);
      const col = parseInt(cell.dataset.col, 10);
      const color = this.board[row][col];
      
      cell.innerHTML = '';
      cell.classList.remove('black-piece', 'white-piece', 'preview');
      
      if (color !== 0) {
        cell.classList.add(color === 1 ? 'black-piece' : 'white-piece');
        const piece = document.createElement('div');
        piece.className = `piece piece-${color === 1 ? 'black' : 'white'}`;
        cell.appendChild(piece);
      }
    });
  }
  
  // 高亮最后落子位置
  highlightLastMove(moves) {
    this.boardElement.querySelectorAll('.excel-cell.last-move').forEach(cell => {
      cell.classList.remove('last-move');
    });
    
    if (moves && moves.length > 0) {
      const lastMove = moves[moves.length - 1];
      const cell = this.boardElement.querySelector(
        `.excel-cell[data-row="${lastMove.row}"][data-col="${lastMove.col}"]`
      );
      if (cell) {
        cell.classList.add('last-move');
      }
    }
  }
  
  // 处理棋盘点击
  handleBoardClick(event) {
    if (this.gameStatus !== 'playing' || this.currentPlayer !== this.playerColor) {
      return;
    }
    
    const cell = event.target.closest('.excel-cell');
    if (!cell) return;
    
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);
    
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
    
    const cell = event.target.closest('.excel-cell');
    if (!cell) return;
    
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);
    
    // 只在空格子上显示预览
    if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize && this.board[row][col] === 0) {
      this.clearPreview();
      this.previewCell = cell;
      cell.classList.add('preview', this.playerColor === 1 ? 'preview-black' : 'preview-white');
    }
  }
  
  // 处理鼠标离开单元格
  handleBoardLeave(event) {
    const cell = event.target.closest('.excel-cell');
    if (cell && cell === this.previewCell) {
      this.clearPreview();
    }
  }
  
  // 清除预览棋子
  clearPreview() {
    if (this.previewCell) {
      this.previewCell.classList.remove('preview', 'preview-black', 'preview-white');
      this.previewCell = null;
    }
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
    this.renderBoard();
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
    
    this.createBoard();
  }
  
  // 更新游戏状态
  updateGameState(gameState) {
    this.board = gameState.board;
    this.currentPlayer = gameState.currentPlayer;
    this.gameStatus = gameState.gameStatus;
    this.winner = gameState.winner;
    
    this.clearPreview();
    this.renderBoard();
    this.highlightLastMove(gameState.moves);
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
