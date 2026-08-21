<script setup>
import { ref, computed } from 'vue'

// --- Data ---
const projects = ref([
  { name: 'FLORIAN HALLDOR', url: 'https://florian.halldor.ch', desc: 'Current Project Workspace' }
])

const socials = ref([
  { name: 'Instagram', url: 'https://www.instagram.com/halldor0', icon: '📸' },
  { name: 'Email', url: 'mailto:halldorandri.omarsson@gmail.com', icon: '✉️' }
])

// --- 3D Mouse Tracking Logic ---
const mouseX = ref(0)
const mouseY = ref(0)

const handleMouseMove = (e) => {
  // Calculate mouse position relative to the center of the screen
  const xVal = (e.clientX / window.innerWidth - 0.5) * 20 // Max 10 deg rotation
  const yVal = (e.clientY / window.innerHeight - 0.5) * -20

  mouseX.value = xVal
  mouseY.value = yVal
}

const resetMouse = () => {
  // Smoothly return to center when mouse leaves
  mouseX.value = 0
  mouseY.value = 0
}

// Apply the dynamic rotation via computed styles
const containerStyle = computed(() => ({
  transform: `rotateX(${mouseY.value}deg) rotateY(${mouseX.value}deg)`
}))
</script>

<template>
  <div class="viewport" @mousemove="handleMouseMove" @mouseleave="resetMouse">

    <!-- Animated Full-Screen Background -->
    <div class="cyber-grid"></div>
    <div class="vignette"></div>

    <!-- Main 3D Interface -->
    <div class="hud-container" :style="containerStyle">

      <header class="header">
        <div class="image-wrapper">
          <!-- REPLACE WITH YOUR IMAGE -->
          <img src="https://via.placeholder.com/200/0a0a0a/ff2a2a?text=YOUR+IMG" alt="Profile" class="profile-img" />
          <div class="image-glow"></div>
        </div>
        <h1 class="glitch-title" data-text="HALLDOR HUB">HALLDOR HUB</h1>
        <p class="subtitle">SYSTEM // ONLINE</p>
      </header>

      <main class="dashboard">
        <!-- Projects Section -->
        <section class="panel projects-panel">
          <div class="panel-header">_PROJECTS</div>
          <a
              v-for="(project, index) in projects"
              :key="index"
              :href="project.url"
              target="_blank"
              class="neon-card primary-card"
          >
            <div class="card-content">
              <h2>{{ project.name }}</h2>
              <p>{{ project.desc }}</p>
            </div>
            <div class="arrow">↗</div>
          </a>
        </section>

        <!-- Socials Section -->
        <section class="panel socials-panel">
          <div class="panel-header">_CONNECT</div>
          <div class="social-grid">
            <a
                v-for="(social, index) in socials"
                :key="index"
                :href="social.url"
                target="_blank"
                class="neon-card social-card"
            >
              <span class="icon">{{ social.icon }}</span>
              <span class="social-name">{{ social.name }}</span>
            </a>
          </div>
        </section>
      </main>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

/* --- Viewport & Background --- */
.viewport {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  background-color: #050000;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Share Tech Mono', monospace;
  perspective: 1200px; /* Crucial for the 3D effect */
}

/* Moving Perspective Grid */
.cyber-grid {
  position: absolute;
  top: 0;
  left: -50%;
  width: 200%;
  height: 200%;
  background-image:
      linear-gradient(transparent 64%, rgba(255, 0, 0, 0.4) 65%, transparent 66%),
      linear-gradient(90deg, transparent 64%, rgba(255, 0, 0, 0.4) 65%, transparent 66%);
  background-size: 80px 80px;
  transform: rotateX(60deg) translateY(0);
  transform-origin: center top;
  animation: gridMove 3s linear infinite;
  z-index: 0;
}

@keyframes gridMove {
  0% { transform: rotateX(70deg) translateY(0); }
  100% { transform: rotateX(70deg) translateY(80px); }
}

/* Dark edges to blend the grid */
.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 20%, #050000 80%);
  z-index: 1;
  pointer-events: none;
}

/* --- Main HUD Container --- */
.hud-container {
  position: relative;
  z-index: 10;
  width: 90%;
  max-width: 1200px; /* Takes up much more of a PC screen */
  background: rgba(10, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 42, 42, 0.3);
  border-radius: 20px;
  padding: 4rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
  box-shadow: 0 0 50px rgba(255, 0, 0, 0.1), inset 0 0 30px rgba(255, 0, 0, 0.05);
  transform-style: preserve-3d;
  transition: transform 0.1s ease-out; /* Smooth mouse tracking */
}

/* --- Header & Glitch Text --- */
.header {
  text-align: center;
  transform: translateZ(60px); /* Pops out of the card */
}

.image-wrapper {
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0 auto 1.5rem;
}

.profile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid #ff2a2a;
  position: relative;
  z-index: 2;
  filter: grayscale(20%) contrast(120%);
}

.image-glow {
  position: absolute;
  inset: -10px;
  background: #ff2a2a;
  border-radius: 50%;
  filter: blur(25px);
  opacity: 0.6;
  z-index: 1;
  animation: pulse 2s ease-in-out infinite alternate;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.4; }
  100% { transform: scale(1.1); opacity: 0.8; }
}

.glitch-title {
  font-size: 4rem;
  color: #fff;
  margin: 0;
  position: relative;
  display: inline-block;
  text-shadow: 2px 2px 0px #ff2a2a, -2px -2px 0px #00ffff;
  letter-spacing: 5px;
}

.subtitle {
  color: #ff2a2a;
  letter-spacing: 10px;
  margin-top: 0.5rem;
  opacity: 0.8;
}

/* --- Dashboard Layout --- */
.dashboard {
  display: grid;
  grid-template-columns: 2fr 1fr; /* Asymmetric, wide layout */
  gap: 2rem;
  transform: translateZ(40px); /* Pops out */
}

.panel-header {
  color: #ff2a2a;
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  letter-spacing: 2px;
  border-bottom: 1px solid rgba(255, 42, 42, 0.3);
  padding-bottom: 0.5rem;
}

/* --- Cyber Cards --- */
.neon-card {
  display: flex;
  background: rgba(20, 0, 0, 0.8);
  border: 1px solid rgba(255, 42, 42, 0.4);
  text-decoration: none;
  color: white;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.neon-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 42, 42, 0.2), transparent);
  transform: skewX(-25deg);
  transition: 0.5s;
}

.neon-card:hover::before {
  left: 150%;
}

.neon-card:hover {
  background: rgba(40, 0, 0, 0.9);
  border-color: #ff2a2a;
  box-shadow: 0 0 20px rgba(255, 42, 42, 0.4), inset 0 0 15px rgba(255, 42, 42, 0.2);
  transform: translateY(-5px);
}

/* Primary Project Card */
.primary-card {
  padding: 2.5rem;
  border-radius: 12px;
  justify-content: space-between;
  align-items: center;
}

.primary-card h2 {
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  color: #ff2a2a;
}

.primary-card p {
  margin: 0;
  font-size: 1.2rem;
  color: #aaa;
}

.arrow {
  font-size: 3rem;
  color: #ff2a2a;
  transition: transform 0.3s ease;
}

.primary-card:hover .arrow {
  transform: translate(10px, -10px);
}

/* Social Grid */
.social-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.social-card {
  padding: 1.5rem;
  border-radius: 8px;
  align-items: center;
  font-size: 1.3rem;
}

.icon {
  margin-right: 15px;
  font-size: 1.5rem;
}

/* --- Responsive Layout --- */
@media (max-width: 900px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
  .hud-container {
    padding: 2rem;
    width: 95%;
  }
  .glitch-title {
    font-size: 2.5rem;
  }
}
</style>
