import Header from "./components/Header";
import StrategyPage from "./pages/StrategyPage";

function App() {
  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      <Header />
      <StrategyPage />
    </div>
  );
}

export default App;
