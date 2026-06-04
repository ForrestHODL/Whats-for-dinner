import { Routes, Route, NavLink } from "react-router-dom";
import { StoreProvider } from "./StoreContext";
import WeekPage from "./pages/WeekPage";
import MealsPage from "./pages/MealsPage";
import RecipePage from "./pages/RecipePage";
import RecipesPage from "./pages/RecipesPage";
import NewRecipePage from "./pages/NewRecipePage";
import ImportRecipePage from "./pages/ImportRecipePage";
import SavedRecipePage from "./pages/SavedRecipePage";
import ShoppingListPage from "./pages/ShoppingListPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <StoreProvider>
      <div className="app">
        <main className="main">
          <Routes>
            <Route path="/" element={<WeekPage />} />
            <Route path="/meals" element={<MealsPage />} />
            <Route path="/meals/:mealId/recipe" element={<RecipePage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/recipes/new" element={<NewRecipePage />} />
            <Route path="/recipes/import" element={<ImportRecipePage />} />
            <Route path="/recipes/:recipeId" element={<SavedRecipePage />} />
            <Route path="/shopping" element={<ShoppingListPage />} />
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
          <NavLink to="/recipes" className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="nav-icon" aria-hidden>📖</span>
            <span>Recipes</span>
          </NavLink>
          <NavLink to="/shopping" className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="nav-icon" aria-hidden>🛒</span>
            <span>Shop</span>
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
