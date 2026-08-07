import ArcadeSwitcher from "./ArcadeSwitcher";

const Arrow = () => <span aria-hidden="true">↗</span>;

export default function Home() {
  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="PEPEPOW Arcade home">
          <img className="brand-logo" src="/brand/pepepow-logo.webp" alt="" width="512" height="512" />
          <span>PEPEPOW <b>ARCADE</b></span>
        </a>
        <div className="nav-links">
          <a href="#play">Games</a>
          <a href="#play">Play</a>
          <a href="#chain">PEPEPOW</a>
        </div>
        <a className="nav-cta" href="#play"><span className="nav-cta-long">Play now</span><span className="nav-cta-short">Play</span> <Arrow /></a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><i /> PEPEPOW GAME PLATFORM · 6 PLAYABLE GAMES</div>
          <h1>PEPEPOW<br/><span>ARCADE</span></h1>
          <p className="hero-lede">
            Six lightweight browser games for phone and desktop. Start playing instantly — no install, login or wallet required.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#play">Play now <Arrow /></a>
          </div>
        </div>

        <div className="hero-art" aria-label="PEPEPOW miner overlooking a proof-of-work city">
          <img src="/brand/pepepow-miner-city.webp" alt="PEPEPOW miner in a futuristic proof-of-work city" width="1600" height="900" />
          <div className="hero-art-badge">
            <img src="/brand/pepepow-logo.webp" alt="" width="512" height="512" />
            <span><small>PEPEPOW</small><strong>Game Platform</strong></span>
          </div>
        </div>
      </section>

      <ArcadeSwitcher />

      <section className="chain section" id="chain">
        <div className="section-head inverse">
          <div><span className="section-kicker">02 / OPTIONAL INTEGRATION</span><h2>PEPEPOW integration</h2></div>
          <p>Future chain features are optional. Gameplay remains off-chain; wallet actions can be added only for events, rewards or other clear use cases.</p>
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

      <footer><span>PEPEPOW ARCADE · 2026</span><a href="#play">Games ↑</a></footer>
    </main>
  );
}
