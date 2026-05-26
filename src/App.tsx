import { Routes, Route, NavLink } from "react-router-dom";
import { StoreProvider } from "./StoreContext";
import WeekPage from "./pages/WeekPage";
import MealsPage from "./pages/MealsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <StoreProvider>
      <div className="app">
        <main className="main">
          <Routes>
            <Route path="/" element={<WeekPage />} />
            <Route path="/meals" element={<MealsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <nav className="bottom-nav" aria-label="Main navigation">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="nav-icon" aria-hidden>📅</span>
            <span>Week</span>
          </NavLink>
          <NavLink to="/meals" className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="nav-icon" aria-hidden>🍽️</span>
            <span>Meals</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="nav-icon" aria-hidden>⚙️</span>
            <span>Account</span>
          </NavLink>
        </nav>
      </div>
    </StoreProvider>
  );
}
