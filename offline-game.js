// ==========================================================
//  ไฟล์ offline-game.js 
// ==========================================================

// --- 1. ค่าคงที่และสถานะเริ่มต้นของเกม ---
const lootTable = [
    { name: "อาหารกระป๋อง", type: "Food", hp: 3 }, { name: "ชุดปฐมพยาบาล", type: "Food", hp: 7 },
    { name: "มีด", type: "MeleeWeapon", damage: 4 }, { name: "ธนู", type: "RangedWeapon", damage: 6, hitRoll: 3 },
    { name: "ปืนพก", type: "RangedWeapon", damage: 10, hitRoll: 4 }
];
const BOT_COLORS = ['#f0ad4e', '#5bc0de', '#5cb85c', '#d9534f', '#428bca', '#777', '#333'];
let gameState = { boardState: {}, players: {}, turnOrder: [], currentTurnIndex: 0, walls: {} };
const HUMAN_PLAYER_ID = "player1";
let battleState = { isActive: false };

// --- 2. ดึง Element จาก HTML ---
const startScreen = document.getElementById('start-screen');
const startGameBtn = document.getElementById('start-game-btn');
const botCountSelect = document.getElementById('bot-count-select');
const gameContainer = document.getElementById('game-container');
const gameBoard = document.getElementById('game-board');
const turnIndicator = document.getElementById('turn-indicator');
const playerHpSpan = document.getElementById('player-hp');
const actionsLeftSpan = document.getElementById('actions-left');
const moveUpBtn = document.getElementById('move-up-btn');
const moveDownBtn = document.getElementById('move-down-btn');
const moveLeftBtn = document.getElementById('move-left-btn');
const moveRightBtn = document.getElementById('move-right-btn');
const searchBtn = document.getElementById('search-btn');
const inventoryBtn = document.getElementById('inventory-btn');
const inventoryModal = document.getElementById('inventory-modal');
const closeInventoryBtn = document.getElementById('close-inventory-btn');
const inventoryList = document.getElementById('inventory-list');
const attackModal = document.getElementById('attack-modal');
const closeAttackModalBtn = document.getElementById('close-attack-modal-btn');
const targetNameSpan = document.getElementById('target-name');
const weaponSelectionList = document.getElementById('weapon-selection-list');
const diceRollResultDiv = document.getElementById('dice-roll-result');
const diceResultSpan = document.getElementById('dice-result');
const attackOutcomeP = document.getElementById('attack-outcome');
const gameOverModal = document.getElementById('game-over-modal');
const rankDisplay = document.getElementById('rank-display');
const restartBtn = document.getElementById('restart-btn');
const winModal = document.getElementById('win-modal');
const winRestartBtn = document.getElementById('win-restart-btn');
const battleModal = document.getElementById('battle-modal');
const battleTitle = document.getElementById('battle-title');
const battleLog = document.getElementById('battle-log');
const attackerControls = document.getElementById('attacker-controls');
const attackerName = document.getElementById('attacker-name');
const battleWeaponList = document.getElementById('battle-weapon-list');
const defenderControls = document.getElementById('defender-controls');
const defenderName = document.getElementById('defender-name');
const defendBtn = document.getElementById('defend-btn');
const escapeBtn = document.getElementById('escape-btn');
const gameLog = document.getElementById('game-log');
const damagePopup = document.getElementById('damage-popup');
const popupAttackerName = document.getElementById('popup-attacker-name');
const popupDamageAmount = document.getElementById('popup-damage-amount');
const skipBattleBtn = document.getElementById('skip-battle-btn');

// --- ฟังก์ชัน Helper ---
function addLogMessage(message) {
    const li = document.createElement('li');
    li.innerHTML = message;
    gameLog.prepend(li);
    if (gameLog.children.length > 20) { gameLog.lastChild.remove(); }
}

function showDamagePopup(attackerName, damage) {
    popupAttackerName.textContent = attackerName;
    popupDamageAmount.textContent = damage;
    damagePopup.classList.remove('popup-hidden');
    damagePopup.classList.add('show');
    setTimeout(() => {
        damagePopup.classList.remove('show');
        setTimeout(() => { damagePopup.classList.add('popup-hidden'); }, 500);
    }, 2500);
}

function isWallBetween(pos1, pos2) {
    const key1 = `${pos1.row}-${pos1.col}`;
    const walls1 = gameState.walls[key1];
    if (!walls1) return false;
    if (pos1.row === pos2.row) {
        if (pos1.col < pos2.col && walls1.right) return true;
        if (pos1.col > pos2.col && walls1.left) return true;
    } else if (pos1.col === pos2.col) {
        if (pos1.row < pos2.row && walls1.bottom) return true;
        if (pos1.row > pos2.row && walls1.top) return true;
    }
    return false;
}

// --- 3. ฟังก์ชันสำหรับ "วาด" หน้าจอ ---
function redrawScreen() {
    gameBoard.innerHTML = '';
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.id = `cell-${row}-${col}`;
            const cellKey = `${row}-${col}`;
            const location = gameState.boardState[cellKey];
            if (location) {
                cell.classList.add(`location-${location.type.toLowerCase()}`);
                const icon = document.createElement('span');
                icon.classList.add('location-icon');
                if (location.type === 'House') icon.textContent = '🏠';
                if (location.type === 'Shipwreck') icon.textContent = '🚢';
                if (location.type === 'Well') icon.textContent = '💧';
                if (location.type === 'Plaza') icon.textContent = '🏛️';
                cell.appendChild(icon);
            }
            const cellWalls = gameState.walls[cellKey];
            if (cellWalls) {
                if (cellWalls.top) cell.classList.add('wall-top');
                if (cellWalls.bottom) cell.classList.add('wall-bottom');
                if (cellWalls.left) cell.classList.add('wall-left');
                if (cellWalls.right) cell.classList.add('wall-right');
            }
            gameBoard.appendChild(cell);
        }
    }
    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        if (player.status !== 'active') continue;
        const { row, col } = player.position;
        const cell = document.getElementById(`cell-${row}-${col}`);
        if (cell) {
            const playerToken = document.createElement('div');
            playerToken.classList.add('player-token');
            playerToken.style.backgroundColor = player.color;
            const playerNumber = gameState.turnOrder.indexOf(playerId) + 1;
            playerToken.textContent = String(playerNumber).padStart(2, '0');
            cell.appendChild(playerToken);
        }
    }
    const myPlayer = gameState.players[HUMAN_PLAYER_ID];
    if (myPlayer) {
        playerHpSpan.textContent = myPlayer.hp;
        actionsLeftSpan.textContent = myPlayer.actionsLeft;
    }
    addCellClickListeners();
}

function addCellClickListeners() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (cell) { cell.onclick = () => onCellClick(r, c); }
        }
    }
}

function onCellClick(row, col) {
    const myTurn = gameState.turnOrder[gameState.currentTurnIndex] === HUMAN_PLAYER_ID;
    if (!myTurn || battleState.isActive) return;
    for (const targetId in gameState.players) {
        if (targetId === HUMAN_PLAYER_ID) continue;
        const target = gameState.players[targetId];
        if (target.status === 'active' && target.position.row === row && target.position.col === col) {
            const myPlayer = gameState.players[HUMAN_PLAYER_ID];
            const myPos = myPlayer.position;
            const targetPos = target.position;
            const distance = Math.abs(myPos.row - targetPos.row) + Math.abs(myPos.col - targetPos.col);
            if (distance === 1) {
                if (isWallBetween(myPos, targetPos)) {
                    alert("มีกำแพงขวางอยู่ โจมตีไม่ได้!");
                } else {
                    openAttackModal(targetId);
                }
            } else {
                alert("เป้าหมายอยู่ไกลเกินไป!");
            }
            return;
        }
    }
}

// --- 4. ฟังก์ชันสำหรับ "การกระทำ" และ "การต่อสู้" ---
function openAttackModal(targetId) {
    const target = gameState.players[targetId];
    const myPlayer = gameState.players[HUMAN_PLAYER_ID];
    targetNameSpan.textContent = target.name;
    weaponSelectionList.innerHTML = '';
    diceRollResultDiv.style.display = 'none';
    const rangedWeapons = myPlayer.inventory.filter(item => item.type === 'RangedWeapon');
    if (rangedWeapons.length === 0) {
        weaponSelectionList.innerHTML = '<li>คุณไม่มีอาวุธระยะไกล!</li>';
    } else {
        rangedWeapons.forEach(weapon => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = `${weapon.name} (DMG: ${weapon.damage}, ต้องการ ${weapon.hitRoll}+)`;
            button.onclick = () => executeAttack(HUMAN_PLAYER_ID, targetId, weapon);
            li.appendChild(button);
            weaponSelectionList.appendChild(li);
        });
    }
    attackModal.classList.remove('modal-hidden');
    attackModal.classList.add('modal-visible');
}

function executeAttack(attackerId, targetId, weapon) {
    const attacker = gameState.players[attackerId];
    const target = gameState.players[targetId];
    if (attacker.actionsLeft <= 0) {
        if (attackerId === HUMAN_PLAYER_ID) alert("Action ไม่พอ!");
        return false;
    }
    attacker.actionsLeft -= 1;
    if (attackerId === HUMAN_PLAYER_ID) weaponSelectionList.innerHTML = '';
    const roll = Math.floor(Math.random() * 6) + 1;
    if (attackerId === HUMAN_PLAYER_ID) {
        diceResultSpan.textContent = roll;
        diceRollResultDiv.style.display = 'block';
    }
    if (roll >= weapon.hitRoll) {
        target.hp -= weapon.damage;
        addLogMessage(`💥 ${attacker.name} โจมตี ${target.name} ด้วย ${weapon.name} สำเร็จ! (-${weapon.damage} HP)`);
        if (targetId === HUMAN_PLAYER_ID) {
            showDamagePopup(attacker.name, weapon.damage);
        }
        if (target.hp <= 0) {
            target.hp = 0;
            target.status = 'dead';
            addLogMessage(`☠️ ${target.name} พ่ายแพ้แล้ว!`);
            if (targetId === HUMAN_PLAYER_ID) {
                setTimeout(gameOver, 1500);
            }
        }
    } else {
        addLogMessage(`💨 ${attacker.name} โจมตี ${target.name} ด้วย ${weapon.name} พลาด!`);
        if (attackerId === HUMAN_PLAYER_ID) attackOutcomeP.textContent = 'โจมตีพลาด!';
    }
    if (target.hp <= 0 && attackerId === HUMAN_PLAYER_ID) {
        const activePlayers = gameState.turnOrder.filter(id => gameState.players[id].status === 'active');
        if (activePlayers.length === 1 && activePlayers[0] === HUMAN_PLAYER_ID) {
             setTimeout(winGame, 1500);
             return true;
        }
    }
    if (attackerId === HUMAN_PLAYER_ID && attacker.actionsLeft <= 0) {
        setTimeout(nextTurn, 2000);
    }
    redrawScreen();
    return true;
}

function movePlayer(playerId, direction) {
    const player = gameState.players[playerId];
    if (player.actionsLeft <= 0) {
        if (playerId === HUMAN_PLAYER_ID) alert("Action หมดแล้ว!");
        return false;
    }
    const currentPosKey = `${player.position.row}-${player.position.col}`;
    const currentWalls = gameState.walls[currentPosKey];
    let newPosition = { ...player.position };
    let moved = false;
    if (direction === 'up' && newPosition.row > 0 && (!currentWalls || !currentWalls.top)) { newPosition.row -= 1; moved = true; }
    else if (direction === 'down' && newPosition.row < 8 && (!currentWalls || !currentWalls.bottom)) { newPosition.row += 1; moved = true; }
    else if (direction === 'left' && newPosition.col > 0 && (!currentWalls || !currentWalls.left)) { newPosition.col -= 1; moved = true; }
    else if (direction === 'right' && newPosition.col < 8 && (!currentWalls || !currentWalls.right)) { newPosition.col += 1; moved = true; }

    if (moved) {
        addLogMessage(`👣 ${player.name} เดินไปทาง ${direction}`);
        for (const otherPlayerId in gameState.players) {
            if (otherPlayerId === playerId || gameState.players[otherPlayerId].status !== 'active') continue;
            const otherPlayer = gameState.players[otherPlayerId];
            if (otherPlayer.position.row === newPosition.row && otherPlayer.position.col === newPosition.col) {
                initiateBattleStage(playerId, otherPlayerId);
                return true;
            }
        }
        player.previousPosition = player.position;
        player.position = newPosition;
        player.actionsLeft -= 1;
        if (player.actionsLeft <= 0 && playerId === HUMAN_PLAYER_ID) {
            setTimeout(nextTurn, 500);
        }
        redrawScreen();
        return true;
    } else {
        if (playerId === HUMAN_PLAYER_ID) alert("เดินไปทางนั้นไม่ได้!");
        return false;
    }
}

function handleSearch(playerId) {
    const player = gameState.players[playerId];
    if (player.actionsLeft <= 0) { return false; }
    const currentPosKey = `${player.position.row}-${player.position.col}`;
    const currentLocation = gameState.boardState[currentPosKey];
    if (!currentLocation) { return false; }
    if (player.searchedThisTurnKey === currentPosKey) { return false; }
    player.actionsLeft -= 1;
    player.searchedThisTurnKey = currentPosKey;
    const foundItem = lootTable[Math.floor(Math.random() * lootTable.length)];
    player.inventory.push(foundItem);
    addLogMessage(`🔍 ${player.name} ค้นพบ ${foundItem.name}!`);
    if (player.actionsLeft <= 0 && playerId === HUMAN_PLAYER_ID) {
        setTimeout(nextTurn, 500);
    }
    redrawScreen();
    return true;
}

function toggleInventory() {
    const myPlayer = gameState.players[HUMAN_PLAYER_ID];
    if (myPlayer.actionsLeft <= 0 && inventoryModal.classList.contains('modal-hidden')) {
        alert("คุณเหนื่อยเกินไป! ต้องมี Action เหลืออย่างน้อย 1 เพื่อเปิดดูของ");
        return;
    }
    if (inventoryModal.classList.contains('modal-hidden')) {
        drawInventory();
        inventoryModal.classList.remove('modal-hidden');
        inventoryModal.classList.add('modal-visible');
    } else {
        inventoryModal.classList.remove('modal-visible');
        inventoryModal.classList.add('modal-hidden');
    }
}

// **การแก้ไขที่ 1: สร้างฟังก์ชันใหม่สำหรับ Battle Inventory**
function toggleInventoryBattle() {
    if (inventoryModal.classList.contains('modal-hidden')) {
        drawInventory();
        inventoryModal.classList.remove('modal-hidden');
        inventoryModal.classList.add('modal-visible');
    } else {
        inventoryModal.classList.remove('modal-visible');
        inventoryModal.classList.add('modal-hidden');
    }
}

function drawInventory() {
    inventoryList.innerHTML = '';
    const myInventory = gameState.players[HUMAN_PLAYER_ID].inventory;
    if (myInventory.length === 0) { inventoryList.innerHTML = '<li>ไม่มีไอเท็มในคลัง</li>'; return; }
    myInventory.forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = `${item.name} (${item.type === 'Food' ? `+${item.hp} HP` : `${item.damage} DMG`})`;
        if (item.type === 'Food') {
            const useButton = document.createElement('button');
            useButton.textContent = 'กิน';
            useButton.onclick = () => useItem(index);
            li.appendChild(useButton);
        }
        inventoryList.appendChild(li);
    });
}

function useItem(itemIndex) {
    const myPlayer = gameState.players[HUMAN_PLAYER_ID];
    const item = myPlayer.inventory[itemIndex];
    if (item && item.type === 'Food') {
        myPlayer.hp = myPlayer.hp + item.hp;
        addLogMessage(`🍔 ${myPlayer.name} กิน ${item.name} (+${item.hp} HP)`);
        myPlayer.inventory.splice(itemIndex, 1);
        drawInventory();
        redrawScreen();
    }
}

// --- 5. ระบบเทิร์น, Battle Stage, Game Over, และ AI ---
function gameOver() {
    const activePlayers = gameState.turnOrder.filter(id => gameState.players[id].status === 'active');
    const myRank = activePlayers.length + 1;
    rankDisplay.textContent = `คุณได้อันดับที่: #${myRank}`;
    gameOverModal.classList.remove('modal-hidden');
    gameOverModal.classList.add('modal-visible');
    document.querySelectorAll('#ui-panel button').forEach(btn => btn.disabled = true);
}

function winGame() {
    winModal.classList.remove('modal-hidden');
    winModal.classList.add('modal-visible');
    document.querySelectorAll('#ui-panel button').forEach(btn => btn.disabled = true);
}

function nextTurn() {
    if (battleState.isActive) return;
    const activePlayers = gameState.turnOrder.filter(id => gameState.players[id].status === 'active');
    if (activePlayers.length === 1 && activePlayers[0] === HUMAN_PLAYER_ID) { winGame(); return; }
    if (activePlayers.length <= 1) {
        const winner = activePlayers.length === 1 ? gameState.players[activePlayers[0]] : null;
        if (winner && winner.id !== HUMAN_PLAYER_ID) { alert(`เกมจบแล้ว! ${winner.name} คือผู้ชนะ!`); }
        else if (!winner) { alert('เกมจบแล้ว! ไม่มีผู้ชนะ!'); }
        document.querySelectorAll('#ui-panel button').forEach(btn => btn.disabled = true);
        return;
    }
    let nextIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
    while (gameState.players[gameState.turnOrder[nextIndex]].status !== 'active') {
        nextIndex = (nextIndex + 1) % gameState.turnOrder.length;
    }
    gameState.currentTurnIndex = nextIndex;
    const nextPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
    const nextPlayer = gameState.players[nextPlayerId];
    nextPlayer.actionsLeft = 3;
    nextPlayer.searchedThisTurnKey = null;
    turnIndicator.textContent = `Turn: ${nextPlayer.name}`;
    turnIndicator.style.backgroundColor = nextPlayer.color;
    addLogMessage(`▶---- ถึงตาของ <strong>${nextPlayer.name}</strong>----▶`);
    if (nextPlayerId === HUMAN_PLAYER_ID) {
        redrawScreen();
    } else {
        setTimeout(() => runBotTurn(nextPlayerId), 1000);
    }
}

function executeBotHeal(botId) {
    const bot = gameState.players[botId];
    if (bot.actionsLeft <= 0) return false;

    // หาของกินที่ดีที่สุดในกระเป๋า (ที่ฮีลเยอะสุด)
    const foodItems = bot.inventory.filter(item => item.type === 'Food');
    if (foodItems.length === 0) return false;

    foodItems.sort((a, b) => b.hp - a.hp); // เรียงลำดับจากฮีลเยอะไปน้อย
    const bestFood = foodItems[0];
    const itemIndex = bot.inventory.indexOf(bestFood);

    // ใช้ไอเท็ม
    bot.hp = Math.min(15, bot.hp + bestFood.hp);
    bot.inventory.splice(itemIndex, 1); // เอาของออกจากกระเป๋า
    bot.actionsLeft -= 1;

    console.log(`%cHEAL: ${bot.name} eats ${bestFood.name} and recovers ${bestFood.hp} HP.`, 'color: cyan');
    return true;
}

async function runBotTurn(botId) {
    const bot = gameState.players[botId];
    for (let i = 0; i < 3; i++) {
        if (bot.actionsLeft <= 0 || bot.status !== 'active') break;
        let actionTaken = false;
        if (bot.hp < 10) {
            if (executeBotHeal(botId)) { actionTaken = true; }
        }
        // AI Logic 2: โจมตีถ้าทำได้ (อัปเกรด)
        if (!actionTaken) {
            const rangedWeapons = bot.inventory.filter(item => item.type === 'RangedWeapon');
            if (rangedWeapons.length > 0) {
                for (const targetId in gameState.players) {
                    if (targetId === botId || gameState.players[targetId].status !== 'active') continue;
                    const target = gameState.players[targetId];
                    const distance = Math.abs(bot.position.row - target.position.row) + Math.abs(bot.position.col - target.position.col);

                    // **การแก้ไข: เพิ่มการตรวจสอบกำแพง**
                    if (distance === 1 && !isWallBetween(bot.position, target.position)) {
                        executeAttack(botId, targetId, rangedWeapons[0]);
                        actionTaken = true;
                        break;
                    }
                }
            }
        }
        if (!actionTaken) {
            if (handleSearch(botId)) { actionTaken = true; }
        }
        if (!actionTaken) {
            const allDirections = ['up', 'down', 'left', 'right'];
            let validDirections = [];
            const { row, col } = bot.position;
            allDirections.forEach(dir => {
                let newPos = { row, col };
                let blocked = false;
                const walls = gameState.walls[`${row}-${col}`];
                if (dir === 'up') {
                    if (row > 0 && (!walls || !walls.top)) newPos.row--; else blocked = true;
                } else if (dir === 'down') {
                    if (row < 8 && (!walls || !walls.bottom)) newPos.row++; else blocked = true;
                } else if (dir === 'left') {
                    if (col > 0 && (!walls || !walls.left)) newPos.col--; else blocked = true;
                } else if (dir === 'right') {
                    if (col < 8 && (!walls || !walls.right)) newPos.col++; else blocked = true;
                }
                const isPreviousPos = bot.previousPosition && newPos.row === bot.previousPosition.row && newPos.col === bot.previousPosition.col;
                if (!blocked && !isPreviousPos) {
                    validDirections.push(dir);
                }
            });
            if (validDirections.length > 0) {
                const smartDirection = validDirections[Math.floor(Math.random() * validDirections.length)];
                movePlayer(botId, smartDirection);
            } else {
                const randomDirection = allDirections[Math.floor(Math.random() * allDirections.length)];
                movePlayer(botId, randomDirection);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    nextTurn();
}

function initiateBattleStage(initiatorId, defenderId) {
    addLogMessage(`⚔️ ${gameState.players[initiatorId].name} เข้าปะทะกับ ${gameState.players[defenderId].name}!`);
    battleState = { isActive: true, participants: [initiatorId, defenderId], log: [] };
    document.querySelectorAll('#ui-panel button').forEach(btn => btn.disabled = true);
    const isBotVsBot = initiatorId !== HUMAN_PLAYER_ID && defenderId !== HUMAN_PLAYER_ID;
    skipBattleBtn.style.display = isBotVsBot ? 'block' : 'none';
    battleModal.classList.remove('modal-hidden');
    battleModal.classList.add('modal-visible');
    updateBattleLog("กำลังทอยเต๋าตัดสินผู้เริ่มโจมตี...");
    setTimeout(() => {
        const roll1 = Math.floor(Math.random() * 6) + 1;
        const roll2 = Math.floor(Math.random() * 6) + 1;
        updateBattleLog(`${gameState.players[initiatorId].name} ทอยได้ ${roll1}. ${gameState.players[defenderId].name} ทอยได้ ${roll2}.`);
        if (roll1 >= roll2) {
            battleState.currentAttacker = initiatorId;
            battleState.currentDefender = defenderId;
        } else {
            battleState.currentAttacker = defenderId;
            battleState.currentDefender = initiatorId;
        }
        updateBattleLog(`${gameState.players[battleState.currentAttacker].name} จะได้โจมตีก่อน!`);
        runBattleRound();
    }, 1500);
}

function runBattleRound() {
    battleState.attackerRoll = null;
    battleState.defenderRoll = null;
    battleState.defenderChoice = null;
    const attacker = gameState.players[battleState.currentAttacker];
    if (battleState.currentAttacker !== HUMAN_PLAYER_ID) {
        attackerControls.style.display = 'none';
        defenderControls.style.display = 'none';
        const weapons = attacker.inventory.filter(item => item.type.includes('Weapon'));
        const weapon = weapons.length > 0 ? weapons[0] : { name: 'หมัด', damage: 1 };
        setTimeout(() => handleBattleAttack(weapon), 1000);
    } else {
        attackerName.textContent = attacker.name;
        defenderControls.style.display = 'none';
        attackerControls.style.display = 'block';
        battleWeaponList.innerHTML = '';
        const weapons = attacker.inventory.filter(item => item.type.includes('Weapon'));
        if (weapons.length > 0) {
            weapons.forEach(weapon => {
                const button = document.createElement('button');
                button.textContent = `${weapon.name} (${weapon.damage} DMG)`;
                button.onclick = () => handleBattleAttack(weapon);
                battleWeaponList.appendChild(button);
            });
        } else {
            const button = document.createElement('button');
            button.textContent = 'ใช้หมัด (1 DMG)';
            button.onclick = () => handleBattleAttack({ name: 'หมัด', damage: 1 });
            battleWeaponList.appendChild(button);
        }
    }
}

function handleBattleAttack(weapon) {
    if (battleState.currentAttacker === HUMAN_PLAYER_ID) {
        attackerControls.style.display = 'none';
    }
    const roll = Math.floor(Math.random() * 6) + 1;
    battleState.attackerRoll = roll;
    battleState.weaponUsed = weapon;
    let damage = weapon.damage || 1;
    let message = `${gameState.players[battleState.currentAttacker].name} ใช้ ${weapon.name} และทอยได้ ${roll}.`;
    if (roll === 6) {
        damage *= 2; message += " Critical Hit! สร้างความเสียหาย 2 เท่า!";
    }
    battleState.potentialDamage = damage;
    updateBattleLog(message);
    if (battleState.currentDefender !== HUMAN_PLAYER_ID) {
        defenderControls.style.display = 'none';
        const choice = (gameState.players[battleState.currentDefender].hp < 7) ? 'escape' : 'defend';
        setTimeout(() => handleDefenderChoice(choice), 1500);
    } else {
        defenderName.textContent = gameState.players[battleState.currentDefender].name;
        defenderControls.style.display = 'block';
    }
}

defendBtn.onclick = () => handleDefenderChoice('defend');
escapeBtn.onclick = () => handleDefenderChoice('escape');

function handleDefenderChoice(choice) {
    if (battleState.currentDefender === HUMAN_PLAYER_ID) {
        defenderControls.style.display = 'none';
    }
    const roll = Math.floor(Math.random() * 6) + 1;
    battleState.defenderRoll = roll;
    let finalDamage = battleState.potentialDamage;
    let message = "";
    if (choice === 'defend') {
        message = `${gameState.players[battleState.currentDefender].name} เลือกป้องกัน และทอยได้ ${roll}.`;
        if (roll === 6) { finalDamage = 0; message += " Perfect Dodge! ไม่ได้รับความเสียหาย!"; }
        else if (roll > battleState.attackerRoll) { finalDamage = Math.ceil(finalDamage / 2); message += ` ป้องกันสำเร็จ! ลดความเสียหายลงครึ่งหนึ่ง เหลือ ${finalDamage} ดาเมจ.`; }
        else { message += ` ป้องกันล้มเหลว! ได้รับ ${finalDamage} ดาเมจ.`; }
    } else {
        message = `${gameState.players[battleState.currentDefender].name} พยายามหนี และทอยได้ ${roll}.`;
        if (roll === 6) { message += " หนีสำเร็จ!"; updateBattleLog(message); endBattle(battleState.currentDefender, 'escaped'); return; }
        else { message += ` หนีล้มเหลว! ได้รับ ${finalDamage} ดาเมจ.`; }
    }
    const defender = gameState.players[battleState.currentDefender];
    defender.hp -= finalDamage;
    if (defender.hp < 0) defender.hp = 0;
    
    if (battleState.currentDefender === HUMAN_PLAYER_ID && finalDamage > 0) {
        showDamagePopup(gameState.players[battleState.currentAttacker].name, finalDamage);
    }
    
    updateBattleLog(message);
    redrawScreen();
    if (defender.hp <= 0) {
        defender.status = 'dead';
        addLogMessage(`☠️ ${defender.name} พ่ายแพ้แล้ว!`);
        updateBattleLog(`${defender.name} พ่ายแพ้แล้ว!`);
        if (battleState.currentDefender === HUMAN_PLAYER_ID) {
            setTimeout(gameOver, 1500);
        }
        endBattle(battleState.currentAttacker, 'won');
        return;
    }
    setTimeout(() => {
        [battleState.currentAttacker, battleState.currentDefender] = [battleState.currentDefender, battleState.currentAttacker];
        updateBattleLog("สลับบทบาท!");
        runBattleRound();
    }, 2000);
}

function endBattle(winnerId, reason) {
    setTimeout(() => {
        battleState.isActive = false;
        battleModal.classList.remove('modal-visible');
        battleModal.classList.add('modal-hidden');
        document.querySelectorAll('#ui-panel button').forEach(btn => btn.disabled = false);
        if (reason === 'escaped') {
            const escaper = gameState.players[winnerId];
            const { row, col } = escaper.position;
            const directions = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
            for (const dir of directions) {
                const newPos = { row: row + dir.r, col: col + dir.c };
                const walls = gameState.walls[`${row}-${col}`];
                if (newPos.row >= 0 && newPos.row < 9 && newPos.col >= 0 && newPos.col < 9) {
                    let wallBlock = false;
                    if(dir.r === -1 && walls && walls.top) wallBlock = true;
                    if(dir.r === 1 && walls && walls.bottom) wallBlock = true;
                    if(dir.c === -1 && walls && walls.left) wallBlock = true;
                    if(dir.c === 1 && walls && walls.right) wallBlock = true;
                    if(!wallBlock) {
                        escaper.position = newPos;
                        break;
                    }
                }
            }
            addLogMessage(`🏃 ${escaper.name} หนีออกจากการต่อสู้สำเร็จ!`);
        } else {
             addLogMessage(`🏆 ${gameState.players[winnerId].name} ชนะการต่อสู้!`);
        }
        redrawScreen();
        if (gameState.players[HUMAN_PLAYER_ID].status === 'active') {
            setTimeout(nextTurn, 500);
        }
    }, 2000);
}

function updateBattleLog(message) {
    battleState.log.push(message);
    battleLog.innerHTML = `<p>${battleState.log.slice(-3).join('</p><p>')}</p>`;
}

function simulateBattleOutcome() {
    let [p1Id, p2Id] = battleState.participants;
    let p1 = gameState.players[p1Id];
    let p2 = gameState.players[p2Id];

    while(p1.status === 'active' && p2.status === 'active') {
        const weapons1 = p1.inventory.filter(item => item.type.includes('Weapon'));
        const weapon1 = weapons1.length > 0 ? weapons1[0] : { name: 'หมัด', damage: 1 };
        p2.hp -= weapon1.damage;
        if (p2.hp <= 0) { p2.status = 'dead'; p2.hp = 0; addLogMessage(`☠️ ${p2.name} พ่ายแพ้แล้ว!`); break; }

        const weapons2 = p2.inventory.filter(item => item.type.includes('Weapon'));
        const weapon2 = weapons2.length > 0 ? weapons2[0] : { name: 'หมัด', damage: 1 };
        p1.hp -= weapon2.damage;
        if (p1.hp <= 0) { p1.status = 'dead'; p1.hp = 0; addLogMessage(`☠️ ${p1.name} พ่ายแพ้แล้ว!`); break; }
    }
    
    const winnerId = p1.status === 'active' ? p1Id : p2Id;
    updateBattleLog(`${gameState.players[winnerId].name} เป็นผู้ชนะในการต่อสู้แบบรวบรัด!`);
    endBattle(winnerId, 'won');
}
function generateRandomWalls(wallCount = 15) {
    const newWalls = {};
    const potentialWalls = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (c < 8) potentialWalls.push({ r, c, dir: 'right' });
            if (r < 8) potentialWalls.push({ r, c, dir: 'down' });
        }
    }
    for (let i = potentialWalls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [potentialWalls[i], potentialWalls[j]] = [potentialWalls[j], potentialWalls[i]];
    }
    const chosenWalls = potentialWalls.slice(0, wallCount);
    chosenWalls.forEach(wall => {
        const key1 = `${wall.r}-${wall.c}`;
        if (wall.dir === 'right') {
            const key2 = `${wall.r}-${wall.c + 1}`;
            newWalls[key1] = { ...newWalls[key1], right: true };
            newWalls[key2] = { ...newWalls[key2], left: true };
        } else {
            const key2 = `${wall.r + 1}-${wall.c}`;
            newWalls[key1] = { ...newWalls[key1], bottom: true };
            newWalls[key2] = { ...newWalls[key2], top: true };
        }
    });
    return newWalls;
}

function generateInitialGameState(botCount) {
    const newBoardState = {};
    const locationsToPlace = [{ type: "House", count: 3 }, { type: "Shipwreck", count: 2 }, { type: "Well", count: 2 }];
    const playerIds = [HUMAN_PLAYER_ID];
    for (let i = 1; i <= botCount; i++) { playerIds.push(`bot${i}`); }
    const edgeSpots = [];
    for (let i = 0; i < 9; i++) {
        edgeSpots.push({ row: 0, col: i }); edgeSpots.push({ row: 8, col: i });
        if (i > 0 && i < 8) { edgeSpots.push({ row: i, col: 0 }); edgeSpots.push({ row: i, col: 8 }); }
    }
    for (let i = edgeSpots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [edgeSpots[i], edgeSpots[j]] = [edgeSpots[j], edgeSpots[i]];
    }
    const newPlayers = {};
    const occupiedSpots = new Set();
    playerIds.forEach((id, index) => {
        const startPosition = edgeSpots.pop();
        newPlayers[id] = {
            hp: 15, actionsLeft: 0, position: startPosition, inventory: [],
            searchedThisTurnKey: null, name: (id === HUMAN_PLAYER_ID) ? "You" : `Bot ${index}`,
            color: (id === HUMAN_PLAYER_ID) ? '#0275d8' : BOT_COLORS[index - 1], status: 'active',
            previousPosition: null
        };
        occupiedSpots.add(`${startPosition.row}-${startPosition.col}`);
    });
    const availableSpots = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const currentKey = `${r}-${c}`;
            if (currentKey === "4-4" || occupiedSpots.has(currentKey)) continue;
            availableSpots.push(currentKey);
        }
    }
    for (let i = availableSpots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableSpots[i], availableSpots[j]] = [availableSpots[j], availableSpots[i]];
    }
    locationsToPlace.forEach(location => {
        for (let i = 0; i < location.count; i++) {
            const spot = availableSpots.pop();
            if (spot) newBoardState[spot] = { type: location.type, looted: false };
        }
    });
    newBoardState["4-4"] = { type: "Plaza", looted: false };
    const randomWalls = generateRandomWalls();
    return { boardState: newBoardState, players: newPlayers, turnOrder: playerIds, walls: randomWalls };
}

function initializeGame(botCount) {
    const initialSetup = generateInitialGameState(botCount);
    gameState = {
        boardState: initialSetup.boardState,
        players: initialSetup.players,
        turnOrder: initialSetup.turnOrder,
        walls: initialSetup.walls,
        currentTurnIndex: -1
    };
    document.querySelectorAll('#ui-panel button').forEach(btn => btn.disabled = false);
    startScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    addLogMessage("------ <strong>เกมเริ่มต้น!</strong> ------");
    redrawScreen();
    nextTurn();
}

// --- 7. Event Listeners ---
startGameBtn.addEventListener('click', () => {
    const botCount = parseInt(botCountSelect.value);
    initializeGame(botCount);
});
moveUpBtn.addEventListener('click', () => movePlayer(HUMAN_PLAYER_ID, 'up'));
moveDownBtn.addEventListener('click', () => movePlayer(HUMAN_PLAYER_ID, 'down'));
moveLeftBtn.addEventListener('click', () => movePlayer(HUMAN_PLAYER_ID, 'left'));
moveRightBtn.addEventListener('click', () => movePlayer(HUMAN_PLAYER_ID, 'right'));
searchBtn.addEventListener('click', () => handleSearch(HUMAN_PLAYER_ID));
inventoryBtn.addEventListener('click', toggleInventory);
closeInventoryBtn.addEventListener('click', toggleInventory);
closeAttackModalBtn.addEventListener('click', () => {
    attackModal.classList.remove('modal-visible');
    attackModal.classList.add('modal-hidden');
});
restartBtn.addEventListener('click', () => { window.location.reload(); });
winRestartBtn.addEventListener('click', () => { window.location.reload(); });
skipBattleBtn.addEventListener('click', simulateBattleOutcome);
