import RunnerGame from "./RunnerGame";
import PetMatchingGame from "./PetMatchingGame";
import PlantDefenseGame from "./PlantDefenseGame";
import IdlePetMiningGame from "./IdlePetMiningGame";
import ExplorationGame from "./ExplorationGame";
import CardBattlerGame from "./CardBattlerGame";

const Arrow = () => <span aria-hidden="true">↗</span>;

export default function Home() {
  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="PEPEPOW Arcade home">
          <span className="brand-mark">PP</span>
          <span>PEPEPOW <b>ARCADE</b></span>
        </a>
        <div className="nav-links">
          <a href="#games">Games</a>
          <a href="#play">Play</a>
          <a href="#chain">PEPEPOW</a>
          <a href="#roadmap">Roadmap</a>
        </div>
        <a className="nav-cta" href="#games">Choose a game <Arrow /></a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><i /> Six playable browser games · prototype season 2026</div>
          <h1>PLAY FIRST.<br/><span>CHAIN LATER.</span></h1>
          <p className="hero-lede">
            Quick, replayable games built for phone and desktop. Play every prototype free in the browser today; PEPEPOW integration comes later, only where it adds real value.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#games">Choose a game <Arrow /></a>
            <a className="button ghost" href="#play-game">Play Runner</a>
          </div>
          <div className="hero-stats" aria-label="Platform goals">
            <div><strong>6</strong><span>playable builds</span></div>
            <div><strong>0</strong><span>required installs</span></div>
            <div><strong>100%</strong><span>off-chain today</span></div>
          </div>
        </div>

        <div className="runner-card" aria-label="Auto-Shooting Runner concept art">
          <div className="game-topline"><span>RUNNER v0.3</span><span className="live-dot">PLAYABLE NOW</span></div>
          <div className="game-world">
            <div className="sun" />
            <div className="speed-lines"><i/><i/><i/><i/></div>
            <div className="enemy e1">×</div><div className="enemy e2">×</div><div className="enemy e3">×</div>
            <div className="shots"><i/><i/><i/></div>
            <div className="runner"><span>▲</span><b>PP</b></div>
            <div className="lane l1"/><div className="lane l2"/>
            <div className="powerup">+2</div>
          </div>
          <div className="game-bottom">
            <div><small>FIRST BUILD</small><strong>Auto‑Shooting Runner</strong></div>
            <span className="score">SCORE&nbsp; 02480</span>
          </div>
        </div>
      </section>

      <section className="games section" id="games">
        <div className="section-head">
          <div><span className="section-kicker">01 / ARCADE SELECT</span><h2>Pick a game.<br/>Jump straight in.</h2></div>
          <p>Six playable prototypes, each with a different loop. No login, wallet or install is required in this phase.</p>
        </div>
        <div className="game-grid">
          <article className="game-tile featured">
            <div className="tile-meta"><span>01</span><b>PLAYABLE NOW</b></div>
            <div className="mini-runner"><i/><i/><strong>PP</strong></div>
            <div><h3><a href="#play-game">Auto‑Shooting<br/>Runner ↗</a></h3><p>Move left and right. Auto-fire. Stack upgrades. Survive the soldiers. Beat the mini-boss, then destroy the final boss.</p></div>
            <div className="tags"><span>v0.3 playable</span><span>action</span><span>1–5 min</span></div>
          </article>
          <article className="game-tile purple"><div className="tile-meta"><span>02</span><b>PLAYABLE NOW</b></div><div className="tile-icon match">◆ ◆<br/> ◆ ◆</div><div><h3><a href="#play-pet-match">Pet<br/>Matching ↗</a></h3><p>Fast tile links, combos, hints, reshuffles and a 90-second score attack.</p></div><div className="tags"><span>v0.1 playable</span><span>puzzle</span></div></article>
          <article className="game-tile dark"><div className="tile-meta"><span>03</span><b>PLAYABLE NOW</b></div><div className="tile-icon defense">♟<span>←</span>♟<span>←</span>♟</div><div><h3><a href="#play-plant-defense">Plant<br/>Defense ↗</a></h3><p>Lane defense with upgradeable units, visible projectile combat, recurring bosses and an endless score chase.</p></div><div className="tags"><span>v0.3 playable</span><span>strategy</span></div></article>
          <article className="game-tile acid"><div className="tile-meta"><span>04</span><b>PLAYABLE NOW</b></div><div className="tile-icon pet">◕‿◕</div><div><h3><a href="#play-idle-pet">Idle Pet<br/>& Mining ↗</a></h3><p>Raise a Hash Hopper, actively mine, upgrade a fictional rig and grow your little base.</p></div><div className="tags"><span>v0.1 playable</span><span>idle</span></div></article>
          <article className="game-tile purple"><div className="tile-meta"><span>05</span><b>PLAYABLE NOW</b></div><div className="tile-icon cube">◇</div><div><h3><a href="#play-3d-world">Blockscape<br/>3D ↗</a></h3><p>Explore three themed zones, find five Block Relics and reach the Node Gate.</p></div><div className="tags"><span>v0.1 playable</span><span>exploration</span></div></article>
          <article className="game-tile"><div className="tile-meta"><span>06</span><b>PLAYABLE NOW</b></div><div className="tile-icon cards"><i/><i/><i/></div><div><h3><a href="#play-card-battler">Node<br/>Tactics ↗</a></h3><p>Predict the next hit, build efficient turns, and shape a different deck across every three-node run.</p></div><div className="tags"><span>v0.2 playable</span><span>tactical</span></div></article>
        </div>
      </section>

      <section className="play-section section" id="play">
        <div className="play-heading">
          <div><span className="section-kicker">01 / AUTO-SHOOTING RUNNER</span><h2>Dodge. Upgrade.<br/>Clear the <em>boss.</em></h2></div>
          <p>Use A/D or ←/→ on desktop, or drag on mobile. Three lives are real: hits remove HP, shields absorb one hit, and zero HP ends the run. Fullscreen now fits the entire playfield on desktop.</p>
        </div>
        <RunnerGame />
      </section>

      <section className="match-section section" id="play-pet-match">
        <div className="play-heading match-heading">
          <div><span className="section-kicker">02 / PLAYABLE PROTOTYPE</span><h2>Pair fast.<br/>Build a <em>combo.</em></h2></div>
          <p>Game 02 is a mobile-first PEPEPOW pet matching game. Match identical pets through a path with no more than two turns, clear the board before time expires, and chase a local high score.</p>
        </div>
        <PetMatchingGame />
      </section>

      <section className="defense-section section" id="play-plant-defense">
        <div className="play-heading defense-heading">
          <div><span className="section-kicker">03 / PLAYABLE PROTOTYPE</span><h2>Build lanes.<br/>Hold the <em>network.</em></h2></div>
          <p>Generate energy with Hash Miners, deploy POW Frogs for automatic fire, and upgrade defenses to Lv.3. Fast Glitches raise the pressure from wave 3; beat a Node Breaker every five waves, then push deeper in Endless mode.</p>
        </div>
        <PlantDefenseGame />
      </section>

      <section className="idle-section section" id="play-idle-pet">
        <div className="play-heading idle-heading">
          <div><span className="section-kicker">04 / PLAYABLE PROTOTYPE</span><h2>Raise a pet.<br/>Grow the <em>rig.</em></h2></div>
          <p>A relaxed idle game with a simple loop: mine HASH, grow your Hash Hopper and rig, then unlock short expeditions to collect finds. Progress saves automatically on this device.</p>
        </div>
        <IdlePetMiningGame />
      </section>

      <section className="explore-section section" id="play-3d-world">
        <div className="play-heading explore-heading">
          <div><span className="section-kicker">05 / PLAYABLE PROTOTYPE</span><h2>Enter the world.<br/>Find the <em>relics.</em></h2></div>
          <p>Game 05 is a lightweight first-person exploration maze. Search three PEPEPOW-themed zones, recover five Block Relics, then navigate to the Node Gate. No install, no 3D engine, and mobile controls are built in.</p>
        </div>
        <ExplorationGame />
      </section>

      <section className="card-section section" id="play-card-battler">
        <div className="play-heading card-heading">
          <div><span className="section-kicker">06 / NODE TACTICS</span><h2>Read the threat.<br/>Build the <em>answer.</em></h2></div>
          <p>See exactly what the enemy will do next, spend your energy, then commit the turn. Three short battles, changing node routes, random upgrade choices and an Overclock challenge make every run play differently.</p>
        </div>
        <CardBattlerGame />
      </section>

      <section className="manifesto" id="principles">
        <p>THE RULE</p>
        <h2>The blockchain should support the game, <em>not replace it.</em></h2>
        <div className="principle-row">
          <span>Gameplay first</span><span>Mobile friendly</span><span>Free to try</span><span>No pay-to-win</span>
        </div>
      </section>

      <section className="chain section" id="chain">
        <div className="section-head inverse">
          <div><span className="section-kicker">02 / CHAIN, OPTIONAL</span><h2>PEPEPOW enters<br/>when it matters.</h2></div>
          <p>Start as a normal browser game. Add on-chain value at meaningful moments — never to every click, shot or move.</p>
        </div>
        <div className="flow" aria-label="Optional PEPEPOW integration flow">
          <div><small>01</small><strong>PLAY FREE</strong><p>No wallet. No payment. Just test the game.</p></div>
          <b>→</b>
          <div><small>02</small><strong>OPT IN</strong><p>Enter a challenge, event or tournament.</p></div>
          <b>→</b>
          <div><small>03</small><strong>VERIFY</strong><p>Later, light.pepepow.net can verify a normal wallet transfer through ElectrumX data.</p></div>
          <b>→</b>
          <div><small>04</small><strong>REWARD</strong><p>Prizes, unlocks or community-funded events.</p></div>
        </div>
        <div className="use-grid">
          <div><span>GOOD FIT</span><h3>Challenges · prizes · cosmetics · tips · event entry · community pools</h3></div>
          <div><span>KEEP OFF-CHAIN</span><h3>Movement · combat · scores in progress · rapid game state · private keys</h3></div>
        </div>
      </section>

      <section className="prototype section" id="roadmap">
        <div className="prototype-copy">
          <span className="section-kicker">03 / ROADMAP</span>
          <h2>Games first.<br/>Platform next.<br/><em>Chain later.</em></h2>
          <p>The playable prototype phase is underway. The next passes focus on shared platform UX and replayability before any wallet or live chain integration.</p>
        </div>
        <div className="build-list">
          {[
            ["01","Playable","Six browser-game prototypes"],
            ["02","Polish","Controls, onboarding and replay loops"],
            ["03","Platform","Shared navigation and game discovery"],
            ["04","Data","Optional public ElectrumX-backed reads"],
            ["05","Wallet","Opt-in wallet connection only when useful"],
            ["06","Events","Challenges, rewards and community play"],
          ].map(([n,t,d], index) => <div className="build-row" key={n}><span>{n}</span><strong>{t}</strong><p>{d}</p><b>{index < 3 ? "✓" : "→"}</b></div>)}
        </div>
      </section>

      <section className="security section">
        <div className="security-title"><span className="section-kicker">04 / NON-NEGOTIABLE</span><h2>Fun can be experimental.<br/>Security cannot.</h2></div>
        <div className="security-cards">
          <article><b>01</b><h3>Never ask for a seed phrase.</h3><p>Private keys stay on the player&apos;s device. Wallet signatures can handle authentication later.</p></article>
          <article><b>02</b><h3>Separate games from funds.</h3><p>Reward wallets stay isolated, automated balances stay limited, early payouts get human review.</p></article>
          <article><b>03</b><h3>Make value obvious.</h3><p>Clearly separate in-game points from real PEPEPOW and record reward calculations transparently.</p></article>
        </div>
      </section>

      <section className="stack section">
        <span className="section-kicker">EXISTING FOUNDATION</span>
        <div className="stack-track"><span>LIGHT.PEPEPOW.NET</span><span>ELECTRUMX</span><span>LIGHT WALLET</span><span>EXPLORER</span><span>TIP BOT</span><span>CLI TOOLS</span></div>
        <p>The useful pieces already exist. The game layer can stay lightweight.</p>
      </section>

      <section className="cta section">
        <span className="section-kicker">PEPEPOW GAME PLATFORM</span>
        <h2>MAKE SOMETHING<br/><em>PLAYABLE.</em></h2>
        <p>Then make it fun. Then bring the chain.</p>
        <a className="button primary" href="#games">Back to the game lab ↑</a>
      </section>

      <footer><span>PEPEPOW ARCADE · DEVELOPMENT CONCEPT 2026</span><span>GAMEPLAY FIRST / COMMUNITY DRIVEN</span></footer>
    </main>
  );
}
