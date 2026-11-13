export function App() {
  return (
    <>
      <a class="skip-link" href="#main">
        Skip to main content
      </a>
      <header>
        <nav aria-label="Game menu">
          <button type="button">Menu</button>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <h1>Press Tab</h1>
        <button type="button">Start</button>
      </main>
    </>
  );
}
