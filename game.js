// Basic Setup
const canvas = document.getElementById("gameCanvas");
const scene = new THREE.Scene();
scene.background = new THREE.Color('skyblue');

// Camera setup
const camera = new THREE.PerspectiveCamera(60, 800 / 400, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(800, 400);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// Game Variables
let gameOver = false;
let gameWon = false;

// Audio for death
const deathSound = new Audio("https://www.myinstants.com/media/sounds/roblox-death-sound-effect.mp3");
deathSound.playbackRate = 1.0; // Normal speed
let hasPlayedDeathSound = false;

// Audio for win
const winSound = new Audio("https://www.myinstants.com/media/sounds/one-more-game.mp3");
winSound.loop = true;
let hasPlayedWinSound = false;

const gravity = 0.012;
let playerSpeed = 0.15;
let jumpPower = 0.25;

// --- Player (Roblox Noob Style Character) ---
const player = new THREE.Group();

const headMat = new THREE.MeshStandardMaterial({ color: 0xffff00, roughness: 0.5 }); // Yellow
const torsoMat = new THREE.MeshStandardMaterial({ color: 0x0000ff, roughness: 0.5 }); // Blue
const legMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, roughness: 0.5 }); // Green

// Torso
const torso = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.5), torsoMat);
torso.position.y = 1.5;
player.add(torso);

// Head
const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), headMat);
head.position.y = 2.3;
player.add(head);

// Left Leg
const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1, 0.5), legMat);
leftLeg.position.set(-0.25, 0.5, 0);
player.add(leftLeg);

// Right Leg
const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1, 0.5), legMat);
rightLeg.position.set(0.25, 0.5, 0);
player.add(rightLeg);

// Left Arm
const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.5), headMat);
leftArm.position.set(-0.75, 1.5, 0);
player.add(leftArm);

// Right Arm
const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.5), headMat);
rightArm.position.set(0.75, 1.5, 0);
player.add(rightArm);

scene.add(player);

let playerVelocity = new THREE.Vector3(0, 0, 0);
let onGround = false;

// --- Lava ---
const lavaGeo = new THREE.PlaneGeometry(500, 500);
const lavaMat = new THREE.MeshStandardMaterial({ color: 'red', emissive: 'darkred' });
const lava = new THREE.Mesh(lavaGeo, lavaMat);
lava.rotation.x = -Math.PI / 2;
lava.position.y = -3;
scene.add(lava);

// Lists
let platforms = [];
let goal = null;

function createLevel() {
    platforms.forEach(p => scene.remove(p));
    if (goal) scene.remove(goal);
    platforms = [];

    const platMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, roughness: 0.3 });
    const platGeo = new THREE.BoxGeometry(5, 0.5, 5); 

    // Generate a long straight path
    const positions = [];
    let curX = 0;
    let curY = -1;
    let curZ = 0;

    for (let i = 0; i < 5; i++) {
        positions.push({ x: curX, y: curY, z: curZ });
        
        // Move to next platform position
        curZ -= 8; // Move forward
        curY += 0.5; // Move up slightly
        // No curX change for a straight line
    }

    positions.forEach(pos => {
        const mesh = new THREE.Mesh(platGeo, platMat);
        mesh.position.set(pos.x, pos.y, pos.z);
        scene.add(mesh);
        platforms.push(mesh);
    });

    const goalGeo = new THREE.BoxGeometry(8, 1, 8);
    const goalMat = new THREE.MeshStandardMaterial({ color: 'lime', emissive: 'green', emissiveIntensity: 0.5 });
    goal = new THREE.Mesh(goalGeo, goalMat);
    // Place goal at the end of the straight path
    goal.position.set(0, curY + 0.5, curZ - 5);
    scene.add(goal);

    player.position.set(0, 2, 0);
    playerVelocity.set(0, 0, 0);
    hasPlayedDeathSound = false;
    hasPlayedWinSound = false;
    
    yaw = 0;
    pitch = 0.3;
}

// --- Camera Controls (Roblox 3rd Person Style) ---
let yaw = 0;
let pitch = 0.3;
let cameraDistance = 10;
let isDragging = false;
let prevMouse = { x: 0, y: 0 };

window.addEventListener('mousedown', e => {
    // Both Left and Right click drag to rotate camera
    if (e.button === 2 || e.button === 0) { 
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
    }
});
window.addEventListener('mouseup', e => {
    if (e.button === 2 || e.button === 0) isDragging = false;
});
window.addEventListener('mousemove', e => {
    if (isDragging) {
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        yaw -= dx * 0.01;
        pitch += dy * 0.01;
        
        // Prevent camera from going upside down or too far below the floor
        pitch = Math.max(-0.1, Math.min(Math.PI/2 - 0.1, pitch));
        
        prevMouse = { x: e.clientX, y: e.clientY };
    }
});
window.addEventListener('contextmenu', e => e.preventDefault());

// --- Keyboard Controls ---
const keys = { w: false, a: false, s: false, d: false, space: false };

window.addEventListener('keydown', e => {
    if (e.code === 'KeyR' && (gameOver || gameWon)) {
        gameOver = false;
        gameWon = false;
        winSound.pause();
        winSound.currentTime = 0;
        document.getElementById('message').style.display = 'none';
        createLevel();
        return;
    }
    if (gameOver || gameWon) return;
    
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = true;
    if (e.code === 'Space') {
        if (onGround) {
            playerVelocity.y = jumpPower;
            onGround = false;
        }
    }
});

window.addEventListener('keyup', e => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false;
});

// Initialize Level
createLevel();

let walkCycle = 0;

function checkCollision(playerObj, box) {
    const pBox = new THREE.Box3().setFromObject(playerObj);
    const bBox = new THREE.Box3().setFromObject(box);
    return bBox.intersectsBox(pBox);
}

function update() {
    if (gameOver || gameWon) return;

    // --- Movement Relative to Camera ---
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0) forward.normalize();

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    right.y = 0;
    if (right.lengthSq() > 0) right.normalize();

    const moveDir = new THREE.Vector3();
    if (keys.w) moveDir.add(forward);
    if (keys.s) moveDir.sub(forward);
    if (keys.a) moveDir.sub(right);
    if (keys.d) moveDir.add(right);

    if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        player.position.x += moveDir.x * playerSpeed;
        player.position.z += moveDir.z * playerSpeed;
        
        // Rotate player to face movement direction smoothly
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        player.rotation.y = targetAngle;

        // Animate legs and arms walking
        if (onGround) {
            walkCycle += 0.2;
            player.children[2].rotation.x = Math.sin(walkCycle) * 0.6; // left leg
            player.children[3].rotation.x = -Math.sin(walkCycle) * 0.6; // right leg
            player.children[4].rotation.x = -Math.sin(walkCycle) * 0.6; // left arm
            player.children[5].rotation.x = Math.sin(walkCycle) * 0.6; // right arm
        }
    } else {
        // Reset limbs when standing still
        player.children[2].rotation.x = 0;
        player.children[3].rotation.x = 0;
        player.children[4].rotation.x = 0;
        player.children[5].rotation.x = 0;
    }

    // Apply Gravity
    playerVelocity.y -= gravity;
    player.position.y += playerVelocity.y;

    // --- Collisions ---
    onGround = false;
    
    // Check Platforms
    for (let plat of platforms) {
        if (checkCollision(player, plat)) {
            // Landing on top (Player's bottom is at y=0 relative to its position, platform is 0.5 tall)
            if (playerVelocity.y < 0 && player.position.y > plat.position.y) {
                player.position.y = plat.position.y + 0.25; // Snap to top
                playerVelocity.y = 0;
                onGround = true;
            }
        }
    }

    // Check Goal Collision
    if (checkCollision(player, goal)) {
        if (playerVelocity.y < 0 && player.position.y > goal.position.y) {
            player.position.y = goal.position.y + 0.5; // Goal is 1 unit tall
            playerVelocity.y = 0;
            onGround = true;
        }
        if (!hasPlayedWinSound) {
            winSound.play();
            hasPlayedWinSound = true;
        }
        gameWon = true;
        const msg = document.getElementById('message');
        msg.innerHTML = "YOU WIN! YOU BEAT THE OBBY!<br><span style='font-size: 20px'>Press R to Restart</span>";
        msg.style.color = "lime";
        msg.style.display = "block";
    }

    // Check Lava Collision
    if (player.position.y <= lava.position.y + 1) {
        if (!hasPlayedDeathSound) {
            deathSound.play();
            hasPlayedDeathSound = true;
        }
        gameOver = true;
        const msg = document.getElementById('message');
        msg.innerHTML = "GAME OVER! YOU FELL IN LAVA!<br><span style='font-size: 20px'>Press R to Restart</span>";
        msg.style.color = "red";
        msg.style.display = "block";
    }

    // --- Update Camera ---
    const offset = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch) * cameraDistance,
        Math.sin(pitch) * cameraDistance,
        Math.cos(yaw) * Math.cos(pitch) * cameraDistance
    );
    
    // The camera looks slightly above the player (at their head)
    const targetPos = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    
    // Smooth camera follow
    camera.position.lerp(targetPos.clone().add(offset), 0.2);
    camera.lookAt(targetPos);
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

animate();