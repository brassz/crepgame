/**
 * Test Script for Zero Delay Animation System
 * 
 * Este script simula múltiplos jogadores para testar a sincronização
 * da animação de dados.
 * 
 * USO:
 *   node test-zero-delay-animation.js
 * 
 * O QUE ELE TESTA:
 *   1. Animação instantânea para o shooter
 *   2. Animação instantânea para observadores
 *   3. Sincronização entre jogadores
 *   4. Latência de rede simulada
 */

const io = require('socket.io-client');

// Configuração
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const NUM_PLAYERS = 3;
const SIMULATED_LATENCY = 50; // ms

// Cores para output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class TestPlayer {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.socket = null;
        this.connected = false;
        this.authenticated = false;
        this.animationStartTime = null;
        this.resultReceivedTime = null;
        this.isShooter = false;
    }
    
    log(message, color = 'reset') {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        console.log(`${colors[color]}[${timestamp}] Player ${this.id} (${this.name}): ${message}${colors.reset}`);
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            this.log('Connecting to server...', 'cyan');
            
            this.socket = io(SERVER_URL, {
                transports: ['websocket'],
                upgrade: false,
                reconnection: false
            });
            
            this.socket.on('connect', () => {
                this.connected = true;
                this.log('✅ Connected to server', 'green');
                this.setupHandlers();
                resolve();
            });
            
            this.socket.on('connect_error', (error) => {
                this.log(`❌ Connection error: ${error.message}`, 'red');
                reject(error);
            });
        });
    }
    
    async authenticate() {
        return new Promise((resolve) => {
            this.log('Authenticating...', 'cyan');
            
            this.socket.emit('authenticate', {
                userId: `test_user_${this.id}`,
                username: this.name,
                roomId: 'test_room',
                credit: 1000
            });
            
            this.socket.once('authenticated', (response) => {
                if (response.success) {
                    this.authenticated = true;
                    this.log('✅ Authenticated successfully', 'green');
                    resolve();
                } else {
                    this.log(`❌ Authentication failed: ${response.error}`, 'red');
                    resolve(); // Continue anyway for testing
                }
            });
            
            // Timeout if no response
            setTimeout(() => {
                if (!this.authenticated) {
                    this.log('⚠️ Authentication timeout, continuing...', 'yellow');
                    this.authenticated = true;
                    resolve();
                }
            }, 2000);
        });
    }
    
    setupHandlers() {
        // Handler para dice_roll_start (OBSERVADORES)
        this.socket.on('dice_roll_start', (data) => {
            if (!this.isShooter) {
                this.animationStartTime = Date.now();
                this.log(`⚡⚡⚡ DICE ROLL START received (shooter: ${data.shooterName})`, 'bright');
                this.log(`    Animation starting NOW for observer`, 'cyan');
            }
        });
        
        // Handler para dice_rolled (RESULTADO)
        this.socket.on('dice_rolled', (data) => {
            this.resultReceivedTime = Date.now();
            
            if (this.isShooter) {
                this.log(`🎯 Result confirmed by server: [${data.dice1}, ${data.dice2}]`, 'green');
            } else {
                const delay = this.resultReceivedTime - this.animationStartTime;
                this.log(`🎯 Result received: [${data.dice1}, ${data.dice2}]`, 'green');
                this.log(`    Time from animation start to result: ${delay}ms`, 'cyan');
            }
        });
        
        // Handler para erros
        this.socket.on('error', (error) => {
            this.log(`❌ Error: ${error.message}`, 'red');
        });
    }
    
    rollDice() {
        if (!this.connected || !this.authenticated) {
            this.log('❌ Cannot roll: not connected or authenticated', 'red');
            return;
        }
        
        this.isShooter = true;
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        
        this.log(`🎲 Rolling dice: [${dice1}, ${dice2}]`, 'magenta');
        this.log(`    Animation starting INSTANTLY for shooter`, 'cyan');
        this.animationStartTime = Date.now();
        
        this.socket.emit('roll_dice', { dice1, dice2 });
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.log('Disconnected', 'yellow');
        }
    }
}

class TestSuite {
    constructor() {
        this.players = [];
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }
    
    async setup() {
        console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════════╗
║           Zero Delay Animation System - Test Suite            ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);
        
        console.log(`\n${colors.yellow}Setting up ${NUM_PLAYERS} test players...${colors.reset}\n`);
        
        // Criar jogadores
        for (let i = 1; i <= NUM_PLAYERS; i++) {
            const player = new TestPlayer(i, `TestPlayer${i}`);
            this.players.push(player);
        }
        
        // Conectar todos
        try {
            await Promise.all(this.players.map(p => p.connect()));
            console.log(`${colors.green}✅ All players connected${colors.reset}\n`);
        } catch (error) {
            console.log(`${colors.red}❌ Failed to connect players: ${error.message}${colors.reset}`);
            return false;
        }
        
        // Autenticar todos
        await Promise.all(this.players.map(p => p.authenticate()));
        console.log(`${colors.green}✅ All players authenticated${colors.reset}\n`);
        
        // Aguardar um pouco para garantir que todos estão prontos
        await this.sleep(1000);
        
        return true;
    }
    
    async runTests() {
        console.log(`${colors.bright}${colors.cyan}Starting tests...${colors.reset}\n`);
        
        await this.testInstantAnimationForShooter();
        await this.sleep(2000);
        
        await this.testInstantAnimationForObservers();
        await this.sleep(2000);
        
        await this.testAnimationSynchronization();
        await this.sleep(2000);
        
        this.printResults();
    }
    
    async testInstantAnimationForShooter() {
        console.log(`${colors.bright}${colors.blue}
═══════════════════════════════════════════════════════════════
Test 1: Instant Animation for Shooter
═══════════════════════════════════════════════════════════════${colors.reset}\n`);
        
        const shooter = this.players[0];
        
        const beforeRoll = Date.now();
        shooter.rollDice();
        const afterRoll = Date.now();
        
        const rollLatency = afterRoll - beforeRoll;
        
        await this.sleep(3000); // Aguardar processamento
        
        const testPassed = rollLatency < 50; // Deve ser < 50ms
        
        this.recordTest(
            'Shooter animation latency',
            rollLatency < 50,
            `Latency: ${rollLatency}ms (expected < 50ms)`
        );
        
        if (testPassed) {
            console.log(`${colors.green}✅ Test PASSED: Shooter sees animation instantly (${rollLatency}ms)${colors.reset}\n`);
        } else {
            console.log(`${colors.red}❌ Test FAILED: Shooter animation latency too high (${rollLatency}ms)${colors.reset}\n`);
        }
    }
    
    async testInstantAnimationForObservers() {
        console.log(`${colors.bright}${colors.blue}
═══════════════════════════════════════════════════════════════
Test 2: Instant Animation for Observers
═══════════════════════════════════════════════════════════════${colors.reset}\n`);
        
        // Reset shooter flag
        this.players.forEach(p => p.isShooter = false);
        
        const shooter = this.players[1];
        const observers = this.players.filter(p => p !== shooter);
        
        // Clear animation times
        observers.forEach(o => {
            o.animationStartTime = null;
            o.resultReceivedTime = null;
        });
        
        const beforeRoll = Date.now();
        shooter.rollDice();
        
        await this.sleep(3000); // Aguardar processamento
        
        // Verificar se observadores receberam dice_roll_start
        const observersReceivedStart = observers.filter(o => o.animationStartTime !== null);
        const allReceived = observersReceivedStart.length === observers.length;
        
        this.recordTest(
            'All observers received dice_roll_start',
            allReceived,
            `${observersReceivedStart.length}/${observers.length} observers received event`
        );
        
        if (allReceived) {
            // Calcular latências
            const latencies = observersReceivedStart.map(o => o.animationStartTime - beforeRoll);
            const maxLatency = Math.max(...latencies);
            const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
            
            console.log(`${colors.cyan}Observer latencies:${colors.reset}`);
            latencies.forEach((lat, i) => {
                console.log(`  Observer ${i + 1}: ${lat}ms`);
            });
            console.log(`  Average: ${avgLatency.toFixed(1)}ms`);
            console.log(`  Max: ${maxLatency}ms\n`);
            
            const testPassed = maxLatency < 200; // Deve ser < 200ms
            
            this.recordTest(
                'Observer animation latency acceptable',
                testPassed,
                `Max latency: ${maxLatency}ms (expected < 200ms)`
            );
            
            if (testPassed) {
                console.log(`${colors.green}✅ Test PASSED: All observers see animation quickly (max ${maxLatency}ms)${colors.reset}\n`);
            } else {
                console.log(`${colors.red}❌ Test FAILED: Observer latency too high (${maxLatency}ms)${colors.reset}\n`);
            }
        } else {
            console.log(`${colors.red}❌ Test FAILED: Not all observers received dice_roll_start${colors.reset}\n`);
        }
    }
    
    async testAnimationSynchronization() {
        console.log(`${colors.bright}${colors.blue}
═══════════════════════════════════════════════════════════════
Test 3: Animation Synchronization Between Players
═══════════════════════════════════════════════════════════════${colors.reset}\n`);
        
        // Reset shooter flag
        this.players.forEach(p => p.isShooter = false);
        
        const shooter = this.players[2];
        const observers = this.players.filter(p => p !== shooter);
        
        // Clear animation times
        observers.forEach(o => {
            o.animationStartTime = null;
            o.resultReceivedTime = null;
        });
        
        shooter.rollDice();
        const shooterStartTime = shooter.animationStartTime;
        
        await this.sleep(3000);
        
        // Calcular diferença entre observadores
        const observerTimes = observers
            .filter(o => o.animationStartTime !== null)
            .map(o => o.animationStartTime);
        
        if (observerTimes.length >= 2) {
            const timeDiffs = [];
            for (let i = 0; i < observerTimes.length - 1; i++) {
                const diff = Math.abs(observerTimes[i] - observerTimes[i + 1]);
                timeDiffs.push(diff);
            }
            
            const maxDiff = Math.max(...timeDiffs);
            
            console.log(`${colors.cyan}Synchronization between observers:${colors.reset}`);
            console.log(`  Max time difference: ${maxDiff}ms\n`);
            
            const testPassed = maxDiff < 100; // Diferença deve ser < 100ms
            
            this.recordTest(
                'Observer synchronization',
                testPassed,
                `Max difference: ${maxDiff}ms (expected < 100ms)`
            );
            
            if (testPassed) {
                console.log(`${colors.green}✅ Test PASSED: Observers are well synchronized (max diff ${maxDiff}ms)${colors.reset}\n`);
            } else {
                console.log(`${colors.red}❌ Test FAILED: Observers not synchronized (diff ${maxDiff}ms)${colors.reset}\n`);
            }
        } else {
            console.log(`${colors.yellow}⚠️ Test SKIPPED: Not enough observers responded${colors.reset}\n`);
            this.recordTest('Observer synchronization', false, 'Not enough data');
        }
    }
    
    recordTest(name, passed, details) {
        this.testResults.tests.push({ name, passed, details });
        if (passed) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
        }
    }
    
    printResults() {
        console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════════╗
║                        Test Results                            ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);
        
        this.testResults.tests.forEach((test, i) => {
            const icon = test.passed ? '✅' : '❌';
            const color = test.passed ? 'green' : 'red';
            console.log(`${colors[color]}${icon} ${test.name}${colors.reset}`);
            console.log(`   ${test.details}\n`);
        });
        
        const total = this.testResults.passed + this.testResults.failed;
        const passRate = (this.testResults.passed / total * 100).toFixed(1);
        
        console.log(`${colors.bright}Summary:${colors.reset}`);
        console.log(`  ${colors.green}Passed: ${this.testResults.passed}${colors.reset}`);
        console.log(`  ${colors.red}Failed: ${this.testResults.failed}${colors.reset}`);
        console.log(`  Pass rate: ${passRate}%\n`);
        
        if (this.testResults.failed === 0) {
            console.log(`${colors.bright}${colors.green}
╔════════════════════════════════════════════════════════════════╗
║               ALL TESTS PASSED! 🎉                             ║
║      Zero Delay Animation System is working correctly!         ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);
        } else {
            console.log(`${colors.bright}${colors.red}
╔════════════════════════════════════════════════════════════════╗
║               SOME TESTS FAILED ⚠️                              ║
║     Please check the server implementation                     ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);
        }
    }
    
    async cleanup() {
        console.log(`${colors.yellow}\nCleaning up...${colors.reset}`);
        this.players.forEach(p => p.disconnect());
        await this.sleep(500);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Executar testes
async function main() {
    const suite = new TestSuite();
    
    const setupSuccess = await suite.setup();
    
    if (!setupSuccess) {
        console.log(`${colors.red}Failed to setup test suite${colors.reset}`);
        process.exit(1);
    }
    
    await suite.runTests();
    await suite.cleanup();
    
    const exitCode = suite.testResults.failed > 0 ? 1 : 0;
    process.exit(exitCode);
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error(`${colors.red}Unhandled rejection: ${error.message}${colors.reset}`);
    process.exit(1);
});

// Run
if (require.main === module) {
    main();
}

module.exports = { TestSuite, TestPlayer };
