// Obtém o elemento canvas e seu contexto 2D para desenho
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Elementos da interface do usuário
const menu = document.getElementById("menu");                       // Menu principal
const gameContainer = document.getElementById("gameContainer");     // Área do jogo
const phaseDisplay = document.getElementById("phaseDisplay");       // fase atual
const scoreElement = document.getElementById("score");              // Pontuação atual
const enemiesLeftElement = document.getElementById("enemiesLeft");  // inimigos restantes
const enemyCountElement = document.getElementById("enemyCount");    // Contador de inimigos

// ==============================================
// VARIÁVEIS GLOBAIS DO JOGO
// ==============================================
let gameActive = false;        // Indica se o jogo está em andamento
let currentPhase = 1;          // Fase atual (1 ou 2)
let animationId = null;        // ID da animação para controle do loop
let score = 0;                 // Pontuação do jogador
let keys = {};                 // Objeto que armazena estado das teclas pressionadas

// High score armazenado no localStorage do navegador (persiste entre sessões)
let highScore = localStorage.getItem('spaceFlappyHighScore') || 0;

// ==============================================
// FASE 1 - FLAPPY BIRD
// ==============================================

const phase1 = {
    player: {
        x: 100,                    // Posição X (fixa)
        y: canvas.height / 2,       // Posição Y (variável)
        width: 30,                  
        height: 30,                 
        velocity: 0,                // Velocidade vertical
        gravity: 0.3,               // Força da gravidade (controla queda)
        jumpForce: -6               // Força do pulo (negativo = para cima)
    },
    obstacles: [],                   
    obstacleWidth: 40,               // Largura dos obstáculos
    gapSize: 120,                    // Tamanho do espaço entre obstáculos
    speed: 2,                         // Velocidade de movimento dos obstáculos
    frameCount: 0                     // Contador de frames para gerar obstáculos
};

// ==============================================
// FASE 2 - COMBATE ESPACIAL
// ==============================================

const phase2 = {
    player: {
        x: 100,                      // Posição X (fixa)
        y: canvas.height / 2,         // Posição Y (controlada pelo jogador)
        width: 30,                    // Largura da nave
        height: 30,                   // Altura da nave
        speed: 3                       // Velocidade de movimento
    },
    enemies: [],    
    bullets: [],  
    maxEnemies: 10,                    // Número máximo de inimigos
    enemiesDestroyed: 0,                // Quantos inimigos foram destruídos
    enemiesPassed: 0,                   // Quantos inimigos passaram pela tela
    enemiesProcessed: 0,                // Total de inimigos que saíram (destruídos + passaram)
    bulletSpeed: 5,                     // Velocidade dos tiros
};

// ==============================================
// EVENT LISTENERS (TECLADO)
// ==============================================

// Evento disparado quando uma tecla é pressionada
document.addEventListener("keydown", (e) => {
    // marca a tecla como pressionada
    keys[e.key] = true;
    
    // Verifica se a tecla "espaço" foi pressionada e o jogo está ativo
    if (e.code === "Space" && gameActive) {
        if (currentPhase === 1) {
            // Fase 1: Aplica força de pulo ao jogador
            phase1.player.velocity = phase1.player.jumpForce;
        } else if (currentPhase === 2) {
            // Fase 2: Dispara um tiro
            shoot();
        }
        e.preventDefault(); // Não deixa a página rolar com a barra de espaço
    }
    
    // Não deixa a página rolar com as teclas de movimento
    if (e.key === "ArrowUp" || e.key === "ArrowDown" || 
        e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") {
        e.preventDefault();
    }
});

// Evento disparado quando uma tecla é solta
document.addEventListener("keyup", (e) => {
    // Marca a tecla como não pressionada
    keys[e.key] = false;
});

// ==============================================
// FUNÇÃO: selectPhase
// Seleciona a fase e inicia o jogo
// ==============================================
function selectPhase(phase) {
    currentPhase = phase;                    // Define a fase atual
    phaseDisplay.textContent = phase;         // Atualiza o display da fase
    score = 0;                                // Zera a pontuação
    scoreElement.textContent = score;          // Atualiza o placar
    
    // Mostra ou esconde o contador de inimigos baseado na fase
    if (phase === 2) {
        enemiesLeftElement.style.display = "block";
        enemyCountElement.textContent = phase2.maxEnemies - phase2.enemiesDestroyed;
    } else {
        enemiesLeftElement.style.display = "none";
    }
    
    // Esconde o menu e mostra a área do jogo
    menu.style.display = "none";
    gameContainer.style.display = "block";
    
    // Inicia a fase selecionada
    startPhase(phase);
}

// ==============================================
// FUNÇÃO: startPhase
// Reinicia as variáveis e inicia a fase
// ==============================================
function startPhase(phase) {
    gameActive = true;  // Marca o jogo como ativo
    
    if (phase === 1) {
        // Reinicia os valores da Fase 1
        phase1.player.y = canvas.height / 2;    // Posição inicial no centro
        phase1.player.velocity = 0;               // Velocidade zero
        phase1.obstacles = [];                     // Remove todos os obstáculos
        phase1.frameCount = 0;                      // Reinicia contador de frames
    } else {
        // Reinicia os valores da Fase 2
        phase2.player.y = canvas.height / 2;       // Posição inicial no centro
        phase2.enemies = [];                         // Remove todos os inimigos
        phase2.bullets = [];                          // Remove todos os tiros
        phase2.enemiesDestroyed = 0;                  // Zera destruídos
        phase2.enemiesPassed = 0;                      // Zera passaram
        phase2.enemiesProcessed = 0;                    // Zera processados
        
        // Cria 10 inimigos em posições aleatórias
        for (let i = 0; i < phase2.maxEnemies; i++) {
            phase2.enemies.push({
                x: canvas.width - 100 + Math.random() * 300,  // Posição X aleatória
                y: Math.random() * (canvas.height - 40) + 20, // Posição Y aleatória
                width: 30,                                      // Largura do inimigo
                height: 30,                                     // Altura do inimigo
                speed: 0.5 + Math.random() * 1.5                // Velocidade variada
            });
        }
        enemyCountElement.textContent = phase2.maxEnemies;  // Atualiza contador
    }
    
    // Cancela animação anterior se existir
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    // Inicia o loop do jogo
    gameLoop();
}

// ==============================================
// FUNÇÃO: gameLoop
// Loop principal do jogo (executado a cada frame)
// ==============================================
function gameLoop() {
    if (!gameActive) return;  // Sai se o jogo não estiver ativo
    
    // Limpa o canvas para redesenhar o frame atual
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenha o fundo estrelado
    drawStars();
    
    // Executa a lógica específica da fase atual
    if (currentPhase === 1) {
        updatePhase1();  // Atualiza posições na fase 1
        drawPhase1();     // Desenha elementos na fase 1
    } else {
        updatePhase2();  // Atualiza posições na fase 2
        drawPhase2();     // Desenha elementos na fase 2
    }
    
    // Desenha o número da fase no canto superior esquerdo
    ctx.fillStyle = "#fff";
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillText(`FASE ${currentPhase}`, 20, 30);
    
    // Solicita o próximo frame (cria o loop infinito)
    animationId = requestAnimationFrame(gameLoop);
}

// ==============================================
// FUNÇÕES DA FASE 1
// ==============================================

// Atualiza a lógica da fase 1 (física, obstáculos, colisões)
function updatePhase1() {
    const p = phase1.player;
    
    // Aplica gravidade ao jogador
    p.velocity += p.gravity;
    p.y += p.velocity;
    
    // Limites da tela (não deixa sair)
    if (p.y < 0) {
        p.y = 0;
        p.velocity = 0;
    }
    if (p.y > canvas.height - p.height) {
        gameOver();  // Morreu se bater no chão
    }
    
    // Gera novos obstáculos a cada 80 frames
    phase1.frameCount++;
    if (phase1.frameCount % 80 === 0) {
        // Calcula posição aleatória para o espaço entre obstáculos
        const gapY = Math.random() * (canvas.height - phase1.gapSize - 100) + 50;
        phase1.obstacles.push({
            x: canvas.width,      // Começa na borda direita
            gapY: gapY,            // Posição Y do espaço
            passed: false          // Se já passou pelo jogador
        });
    }
    
    // Move os obstáculos e verifica colisões
    for (let i = phase1.obstacles.length - 1; i >= 0; i--) {
        const obs = phase1.obstacles[i];
        obs.x -= phase1.speed;  // Move para esquerda
        
        // Verifica se o jogador passou pelo obstáculo (pontua)
        if (!obs.passed && p.x > obs.x + phase1.obstacleWidth) {
            obs.passed = true;
            score++;  // Ganha ponto por passar
            scoreElement.textContent = score;
        }
        
        // Verifica se colidiu com o obstáculo
        if (checkCollisionPhase1(p, obs)) {
            gameOver();
        }
        
        // Remove obstáculos que saíram da tela
        if (obs.x < -phase1.obstacleWidth) {
            phase1.obstacles.splice(i, 1);
        }
    }
}

// Desenha os elementos da fase 1
function drawPhase1() {
    const p = phase1.player;
    
    // Desenha o jogador (nave em forma de triângulo amarelo)
    ctx.fillStyle = "#ff0";
    ctx.beginPath();
    ctx.moveTo(p.x + p.width, p.y + p.height/2);  // Ponta direita
    ctx.lineTo(p.x, p.y);                           // Canto superior esquerdo
    ctx.lineTo(p.x, p.y + p.height);                 // Canto inferior esquerdo
    ctx.closePath();
    ctx.fill();
    
    // Desenha os obstáculos (marrons como asteroides)
    ctx.fillStyle = "#8B4513";
    for (const obs of phase1.obstacles) {
        // Obstáculo de cima
        ctx.fillRect(obs.x, 0, phase1.obstacleWidth, obs.gapY - 20);
        // Obstáculo de baixo
        ctx.fillRect(obs.x, obs.gapY + phase1.gapSize, 
                    phase1.obstacleWidth, canvas.height - obs.gapY - phase1.gapSize);
    }
}

// Verifica colisão entre jogador e obstáculo na fase 1
function checkCollisionPhase1(player, obstacle) {
    // Colisão com obstáculo de cima
    if (player.x + player.width > obstacle.x && 
        player.x < obstacle.x + phase1.obstacleWidth &&
        player.y < obstacle.gapY - 20) {
        return true;
    }
    
    // Colisão com obstáculo de baixo
    if (player.x + player.width > obstacle.x && 
        player.x < obstacle.x + phase1.obstacleWidth &&
        player.y + player.height > obstacle.gapY + phase1.gapSize) {
        return true;
    }
    
    return false;  // Sem colisão
}

// ==============================================
// FUNÇÕES DA FASE 2
// ==============================================

// Atualiza a lógica da fase 2 (movimento, tiros, inimigos)
function updatePhase2() {
    const p = phase2.player;
    
    // Movimento vertical do jogador (W/S ou setas)
    if (keys["w"] || keys["W"] || keys["ArrowUp"]) {
        p.y -= p.speed;  // Sobe
    }
    if (keys["s"] || keys["S"] || keys["ArrowDown"]) {
        p.y += p.speed;  // Desce
    }
    
    // Limita o jogador dentro da tela
    p.y = Math.max(0, Math.min(canvas.height - p.height, p.y));
    
    // Move os inimigos
    for (let i = phase2.enemies.length - 1; i >= 0; i--) {
        const enemy = phase2.enemies[i];
        enemy.x -= enemy.speed;  // Move para esquerda
        
        // Movimento ondulado (seno)
        enemy.y += Math.sin(Date.now() * 0.002) * 0.5;
        
        // Mantém inimigo dentro da tela
        enemy.y = Math.max(0, Math.min(canvas.height - enemy.height, enemy.y));
        
        // Verifica se o inimigo passou (saiu pela esquerda)
        if (enemy.x + enemy.width < 0) {
            phase2.enemies.splice(i, 1);      // Remove inimigo
            phase2.enemiesPassed++;             // Incrementa passaram
            phase2.enemiesProcessed++;           // Incrementa processados
            enemyCountElement.textContent = phase2.maxEnemies - phase2.enemiesDestroyed;
            
            // Verifica se todos os inimigos foram processados
            if (phase2.enemiesProcessed >= phase2.maxEnemies) {
                if (phase2.enemiesDestroyed === phase2.maxEnemies) {
                    victory();  // Vitória se destruiu todos
                } else {
                    gameOver("derrota");  // Derrota se alguns passaram
                }
                return;
            }
        }
    }
    
    // Move os tiros
    for (let i = phase2.bullets.length - 1; i >= 0; i--) {
        const bullet = phase2.bullets[i];
        bullet.x += bullet.speed;  // Move para direita
        
        // Verifica colisão do tiro com inimigos
        for (let j = phase2.enemies.length - 1; j >= 0; j--) {
            const enemy = phase2.enemies[j];
            
            // Detecção de colisão (sobreposição de retângulos)
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                
                // Remove inimigo e tiro
                phase2.enemies.splice(j, 1);
                phase2.bullets.splice(i, 1);
                phase2.enemiesDestroyed++;       // Incrementa destruídos
                phase2.enemiesProcessed++;        // Incrementa processados
                score += 10;                       // Ganha 10 pontos por inimigo
                scoreElement.textContent = score;
                enemyCountElement.textContent = phase2.maxEnemies - phase2.enemiesDestroyed;
                
                // Verifica vitória
                if (phase2.enemiesProcessed >= phase2.maxEnemies) {
                    victory();
                }
                break;
            }
        }
        
        // Remove tiros que saíram da tela
        if (bullet.x > canvas.width) {
            phase2.bullets.splice(i, 1);
        }
    }
    
    // Verifica colisão direta entre jogador e inimigo
    for (const enemy of phase2.enemies) {
        if (p.x + p.width > enemy.x &&
            p.x < enemy.x + enemy.width &&
            p.y + p.height > enemy.y &&
            p.y < enemy.y + enemy.height) {
            gameOver("colisão");  // Morreu ao bater no inimigo
        }
    }
}

// Desenha os elementos da fase 2
function drawPhase2() {
    const p = phase2.player;
    
    // Desenha o jogador (nave verde)
    ctx.fillStyle = "#00ff00";
    ctx.beginPath();
    ctx.moveTo(p.x + p.width, p.y + p.height/2);  // Ponta direita
    ctx.lineTo(p.x, p.y);                           // Canto superior esquerdo
    ctx.lineTo(p.x, p.y + p.height);                 // Canto inferior esquerdo
    ctx.closePath();
    ctx.fill();
    
    // Desenha os inimigos (naves vermelhas)
    ctx.fillStyle = "#ff0000";
    for (const enemy of phase2.enemies) {
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y + enemy.height/2);          // Ponta esquerda
        ctx.lineTo(enemy.x + enemy.width, enemy.y);             // Canto superior direito
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height); // Canto inferior direito
        ctx.closePath();
        ctx.fill();
    }
    
    // Desenha os tiros (retângulos amarelos)
    ctx.fillStyle = "#ffff00";
    for (const bullet of phase2.bullets) {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
}

// ==============================================
// FUNÇÃO: shoot
// Cria um novo tiro na posição do jogador
// ==============================================
function shoot() {
    // Só atira se o jogo estiver ativo e na fase 2
    if (!gameActive || currentPhase !== 2) return;
    
    // Adiciona um novo tiro ao array
    phase2.bullets.push({
        x: phase2.player.x + phase2.player.width,  // Começa na ponta da nave
        y: phase2.player.y + phase2.player.height / 2 - 2,  // Centralizado verticalmente
        width: 10,                                   // Largura do tiro
        height: 4,                                   // Altura do tiro
        speed: phase2.bulletSpeed                    // Velocidade do tiro
    });
}

// ==============================================
// FUNÇÕES AUXILIARES
// ==============================================

// Desenha estrelas no fundo (efeito visual)
function drawStars() {
    for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) continue;  // Desenha apenas metade a cada frame
        ctx.fillStyle = "#fff";
        // Desenha um pequeno retângulo branco em posição aleatória
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }
}

// ==============================================
// FUNÇÃO: gameOver
// Finaliza o jogo com derrota
// ==============================================
function gameOver(motivo = "colisão") {
    gameActive = false;
    cancelAnimationFrame(animationId);
    
    // Verifica se fez novo recorde
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spaceFlappyHighScore', highScore);
    }
    
    // Mensagem diferente dependendo do motivo da derrota
    let mensagem = "";
    if (motivo === "derrota") {
        mensagem = `DERROTA! 💔\nOs inimigos passaram!\nDestruídos: ${phase2.enemiesDestroyed} | Passaram: ${phase2.enemiesPassed}\nPontuação: ${score}\nRecorde: ${highScore}\n\nVoltar ao menu?`;
    } else if (motivo === "colisão") {
        mensagem = `GAME OVER! 💥\nSua nave foi destruída!\nDestruídos: ${phase2.enemiesDestroyed} | Passaram: ${phase2.enemiesPassed}\nPontuação: ${score}\nRecorde: ${highScore}\n\nVoltar ao menu?`;
    }
    
    const playAgain = confirm(mensagem);
    returnToMenu();
}

// ==============================================
// FUNÇÃO: victory
// Finaliza o jogo com vitória (destruiu todos inimigos)
// ==============================================
function victory() {
    gameActive = false;
    cancelAnimationFrame(animationId);
    
    // Verifica se fez novo recorde
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spaceFlappyHighScore', highScore);
    }
    
    const playAgain = confirm(`VITÓRIA! 🎉\nVocê destruiu TODOS os ${phase2.maxEnemies} inimigos!\nPontuação: ${score}\nRecorde: ${highScore}\n\nVoltar ao menu?`);
    
    returnToMenu();
}

// ==============================================
// FUNÇÃO: returnToMenu
// Retorna ao menu principal
// ==============================================
function returnToMenu() {
    menu.style.display = "block";        // Mostra o menu
    gameContainer.style.display = "none"; // Esconde o jogo
    gameActive = false;                   // Desativa o jogo
    
    // Atualiza o display do recorde no menu
    const highScoreDisplay = document.getElementById('highScoreDisplay');
    if (highScoreDisplay) {
        highScoreDisplay.textContent = highScore;
    }
    
    // Cancela a animação se estiver rodando
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}